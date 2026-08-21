import Channel from '../models/Channel.js';
import Config from '../models/Config.js';
import logger from '../utils/logger.js';
import cache, { TTL } from '../utils/cache.js';
import NodeCache from 'node-cache';

/**
 * Majburiy obuna xizmati.
 *
 * Muhim tuzatishlar:
 *  - Kanallar KETMA-KET emas, PARALLEL tekshiriladi (3 kanal = 3x tezroq).
 *  - Bot kanalda admin bo'lmasa, eski kod foydalanuvchini "obuna bo'lmagan"
 *    deb hisoblab, BUTUN BOTNI BLOKLAB QO'YARDI. Endi bunday holat log qilinadi,
 *    lekin foydalanuvchi o'tkaziladi (fail-open) — bot admin sozlamasi
 *    xatosi tufayli hamma foydalanuvchi yo'qotilmaydi.
 *  - Har bir foydalanuvchi natijasi qisqa muddatga keshlanadi.
 */

const memberCache = new NodeCache({ stdTTL: 300, checkperiod: 120, maxKeys: 20000 });

const CONFIG_KEY = 'subscription_enabled';

export const getRequiredChannels = async () => {
    try {
        return await cache.remember('sub:channels', TTL.LONG, () => Channel.find().lean());
    } catch (error) {
        logger.error('getRequiredChannels:', error);
        return [];
    }
};

export const isSubscriptionEnabled = async () => {
    try {
        const value = await cache.remember('sub:enabled', TTL.LONG, async () => {
            const config = await Config.findOne({ key: CONFIG_KEY }).lean();
            return config ? Boolean(config.value) : true;
        });
        return value;
    } catch {
        return true;
    }
};

const invalidateSubscriptionCaches = () => {
    cache.delByPrefix('sub:');
    memberCache.flushAll();
};

export const addChannel = async (channelId, name, inviteLink, adminId) => {
    try {
        await Channel.create({ channelId: String(channelId), name, inviteLink, addedBy: String(adminId) });
        invalidateSubscriptionCaches();
        return true;
    } catch (error) {
        logger.error('addChannel:', error);
        return false;
    }
};

export const removeChannel = async (channelId) => {
    try {
        await Channel.findOneAndDelete({ channelId: String(channelId) });
        invalidateSubscriptionCaches();
        return true;
    } catch (error) {
        logger.error('removeChannel:', error);
        return false;
    }
};

export const clearChannels = async () => {
    try {
        await Channel.deleteMany({});
        invalidateSubscriptionCaches();
        return true;
    } catch {
        return false;
    }
};

export const toggleSubscription = async (status) => {
    try {
        await Config.findOneAndUpdate(
            { key: CONFIG_KEY },
            { value: Boolean(status) },
            { upsert: true, new: true }
        );
        invalidateSubscriptionCaches();
        return true;
    } catch (error) {
        logger.error('toggleSubscription:', error);
        return false;
    }
};

/** Foydalanuvchi obuna holatini keshdan tozalaydi (qayta tekshirish uchun) */
export const invalidateUserSubscription = (userId) => memberCache.del(`sub:${userId}`);

/**
 * Obunani tekshiradi.
 * @returns {Promise<true | Array>} `true` — hammasi joyida; massiv — obuna bo'lmagan kanallar
 */
export const checkSubscription = async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return true;

    try {
        if (memberCache.get(`sub:${userId}`) === true) return true;

        if (!(await isSubscriptionEnabled())) return true;

        const channels = await getRequiredChannels();
        if (channels.length === 0) return true;

        const results = await Promise.all(
            channels.map(async (channel) => {
                try {
                    const member = await ctx.telegram.getChatMember(channel.channelId, userId);
                    return ['left', 'kicked'].includes(member.status) ? channel : null;
                } catch (error) {
                    // Bot kanalda admin emas / kanal o'chirilgan / ID xato.
                    // Foydalanuvchini bloklamaymiz — bu admin sozlamasi muammosi.
                    logger.warn(
                        `Obuna tekshirilmadi (kanal: ${channel.name}). Bot kanalda admin ekanini tekshiring:`,
                        error?.response?.description || error.message
                    );
                    return null;
                }
            })
        );

        const notSubscribed = results.filter(Boolean);

        if (notSubscribed.length === 0) {
            memberCache.set(`sub:${userId}`, true);
            return true;
        }

        return notSubscribed;
    } catch (error) {
        logger.error('checkSubscription:', error);
        return true; // Xatolikda foydalanuvchini to'smaslik
    }
};

/** Obuna talab qiladigan tugmalarni tayyorlaydi */
export const buildSubscriptionButtons = (channels, checkLabel = '✅ Tekshirish') => {
    const buttons = channels.map((channel) => {
        const link = /^https?:\/\//i.test(channel.inviteLink)
            ? channel.inviteLink
            : `https://${String(channel.inviteLink).replace(/^\/+/, '')}`;
        return [{ text: `📢 ${channel.name}`, url: link }];
    });
    buttons.push([{ text: checkLabel, callback_data: 'check_subscription' }]);
    return { inline_keyboard: buttons };
};
