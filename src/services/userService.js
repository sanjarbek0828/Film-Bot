import User from '../models/User.js';
import logger from '../utils/logger.js';
import NodeCache from 'node-cache';

/**
 * Foydalanuvchi xizmati.
 *
 * Muhim tuzatishlar:
 *  - `findOrCreateUser` endi bitta atomik `findOneAndUpdate(upsert)` so'rovi
 *    (avval find → save → create ketma-ketligi 2-3 ta so'rov qilardi va
 *    parallel update'larda race condition bo'lardi).
 *  - Ban/VIP o'zgarganda kesh majburiy tozalanadi (avval 10 sekundgacha
 *    bloklangan foydalanuvchi botdan foydalanishi mumkin edi va aksincha).
 *  - `watchHistory` cheklangan (avval cheksiz o'sib, document 16MB limitiga
 *    yaqinlashib, har o'qishda sekinlashardi).
 */

const userCache = new NodeCache({ stdTTL: 60, checkperiod: 60, useClones: false, maxKeys: 10000 });

const MAX_WATCH_HISTORY = 50;

export const invalidateUserCache = (telegramId) => {
    if (telegramId !== undefined && telegramId !== null) userCache.del(Number(telegramId));
};

const cacheUser = (user) => {
    if (user?.telegramId) userCache.set(Number(user.telegramId), user);
    return user;
};

/**
 * Foydalanuvchini topadi yoki yaratadi (atomik upsert).
 * Ism/username o'zgarganda avtomatik yangilanadi.
 */
export const findOrCreateUser = async (ctx) => {
    const from = ctx.from;
    if (!from?.id) return null;

    const { id, first_name: firstName, username } = from;
    const cached = userCache.get(id);

    // Kesh mavjud va profil o'zgarmagan bo'lsa — DB ga tegmaymiz
    if (cached && cached.firstName === firstName && cached.username === username) {
        return cached;
    }

    try {
        const user = await User.findOneAndUpdate(
            { telegramId: id },
            {
                $set: {
                    firstName: firstName ?? null,
                    username: username ?? null,
                    lastSeenAt: new Date(),
                },
                $setOnInsert: {
                    telegramId: id,
                    language: 'uz',
                    role: 'user',
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                // watchHistory katta bo'lishi mumkin — kerak bo'lmaganda yuklamaymiz
                projection: { watchHistory: 0 },
            }
        );

        return cacheUser(user);
    } catch (error) {
        // Parallel upsert'da duplicate key bo'lishi mumkin — qayta o'qiymiz
        if (error.code === 11000) {
            const user = await User.findOne({ telegramId: id }).select('-watchHistory');
            return cacheUser(user);
        }
        logger.error('findOrCreateUser:', error);
        // Bot ishlashda davom etishi uchun minimal obyekt
        return { telegramId: id, firstName, username, isBanned: false, role: 'user', language: 'uz' };
    }
};

export const getUserByTelegramId = async (telegramId) => {
    const id = Number(telegramId);
    if (!Number.isFinite(id)) return null;

    const cached = userCache.get(id);
    if (cached) return cached;

    try {
        const user = await User.findOne({ telegramId: id }).select('-watchHistory');
        return user ? cacheUser(user) : null;
    } catch (error) {
        logger.error('getUserByTelegramId:', error);
        return null;
    }
};

export const updateUser = async (telegramId, update) => {
    const id = Number(telegramId);
    try {
        const user = await User.findOneAndUpdate({ telegramId: id }, update, {
            new: true,
            projection: { watchHistory: 0 },
        });
        invalidateUserCache(id);
        return user ? cacheUser(user) : null;
    } catch (error) {
        logger.error('updateUser:', error);
        invalidateUserCache(id);
        return null;
    }
};

/** VIP muddatini uzaytiradi (mavjud muddat ustiga qo'shadi) */
export const extendVip = async (telegramId, days, grantedBy = 'system') => {
    const id = Number(telegramId);
    try {
        const user = await User.findOne({ telegramId: id }).select('vipUntil');
        if (!user) return null;

        const base = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
        const vipUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

        const updated = await User.findOneAndUpdate(
            { telegramId: id },
            {
                $set: {
                    vipUntil,
                    vipAddedBy: String(grantedBy),
                    vipAddedAt: new Date(),
                    vipNotified: false,
                },
            },
            { new: true, projection: { watchHistory: 0 } }
        );

        invalidateUserCache(id);
        return updated ? cacheUser(updated) : null;
    } catch (error) {
        logger.error('extendVip:', error);
        return null;
    }
};

export const removeVip = async (telegramId) => {
    const id = Number(telegramId);
    invalidateUserCache(id);
    try {
        return await User.findOneAndUpdate(
            { telegramId: id },
            { $set: { vipUntil: null, vipAddedBy: null, vipAddedAt: null, vipNotified: true } },
            { new: true, projection: { watchHistory: 0 } }
        );
    } catch (error) {
        logger.error('removeVip:', error);
        return null;
    }
};

export const setBanned = async (telegramId, isBanned, { bannedUntil = null, reason = null } = {}) => {
    const id = Number(telegramId);
    invalidateUserCache(id); // Ban darhol kuchga kirishi uchun kesh tozalanadi
    try {
        return await User.findOneAndUpdate(
            { telegramId: id },
            { $set: { isBanned, bannedUntil, banReason: reason } },
            { new: true, projection: { watchHistory: 0 } }
        );
    } catch (error) {
        logger.error('setBanned:', error);
        return null;
    }
};

/**
 * Ko'rish statistikasini yangilaydi: hisoblagich + tarix (cheklangan).
 * `$slice` bilan tarix hajmi doim MAX_WATCH_HISTORY dan oshmaydi.
 */
export const recordMovieWatch = (telegramId, movieId) => {
    const id = Number(telegramId);
    if (!Number.isFinite(id)) return;

    const update = { $inc: { moviesWatched: 1 }, $set: { lastMovieDate: new Date() } };
    if (movieId) {
        update.$push = {
            watchHistory: {
                $each: [{ movie: movieId, watchedAt: new Date() }],
                $slice: -MAX_WATCH_HISTORY,
            },
        };
    }

    User.updateOne({ telegramId: id }, update)
        .then(() => {
            const cached = userCache.get(id);
            if (cached) cached.moviesWatched = (cached.moviesWatched || 0) + 1;
        })
        .catch(() => {});
};

/** Ko'rish tarixi (kino ma'lumotlari bilan) */
export const getWatchHistory = async (telegramId, limit = 20) => {
    try {
        const user = await User.findOne({ telegramId: Number(telegramId) })
            .select('watchHistory')
            .slice('watchHistory', -limit)
            .populate({ path: 'watchHistory.movie', select: 'title code poster' })
            .lean();

        if (!user?.watchHistory) return [];
        return user.watchHistory.filter((entry) => entry.movie).reverse();
    } catch (error) {
        logger.error('getWatchHistory:', error);
        return [];
    }
};

/** Broadcast uchun faqat kerakli maydonlarni oqim (stream) bilan olish */
export const getBroadcastRecipients = async ({ vipOnly = false } = {}) => {
    const filter = { isBanned: { $ne: true } };
    if (vipOnly) filter.vipUntil = { $gt: new Date() };

    const rows = await User.find(filter).select('telegramId').lean();
    return rows.map((row) => row.telegramId);
};

export const countUsers = (filter = {}) => User.countDocuments(filter);

export const cacheStats = () => userCache.getStats();
