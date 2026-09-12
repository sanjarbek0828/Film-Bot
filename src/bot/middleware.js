import NodeCache from 'node-cache';
import { Markup } from 'telegraf';
import { findOrCreateUser, setBanned, invalidateUserCache } from '../services/userService.js';
import { checkSubscription, invalidateUserSubscription } from '../services/subscriptionService.js';
import { createTranslator } from '../utils/locales.js';
import { isAdmin } from '../utils/adminHelper.js';
import { isVipUser } from '../utils/menuUtils.js';
import logger from '../utils/logger.js';

/**
 * Auth + anti-spam + obuna middleware.
 *
 * TUZATILGAN KRITIK BUGLAR:
 *
 * 1. XAVFSIZLIK — huquq oshirish (privilege escalation):
 *    Eski kodda `globalAdminSet` ga bir marta qo'shilgan foydalanuvchi
 *    HECH QACHON o'chirilmasdi. Admin huquqi olib tashlansa ham, u
 *    server restart bo'lgunicha admin bo'lib qolardi. Bundan tashqari,
 *    `globalAdminSet.has(userId)` bloklangan foydalanuvchini
 *    AVTOMATIK BLOKDAN CHIQARARDI (120-qator) — ya'ni bir marta admin
 *    bo'lgan odam ban qilinsa, o'zi avtomatik unban bo'lardi.
 *    Endi admin holati faqat ENV yoki joriy DB roli bo'yicha aniqlanadi.
 *
 * 2. BAN kechikishi: `userService` keshi tufayli ban 60 sekundgacha
 *    kuchga kirmasdi. Endi ban/unban paytida kesh majburiy tozalanadi.
 *
 * 3. Anti-spam adolatsizligi: eski kod tez ikki marta bosishni ham
 *    "strike" deb hisoblardi va 6 tadan keyin BAZAGA ban yozardi.
 *    Endi ban DB ga yozilmaydi — faqat xotirada vaqtinchalik cheklov
 *    (bazani ifloslantirmaydi va o'zi tiklanadi).
 *
 * 4. `ctx.reply()` bloklangan foydalanuvchida throw qilib, `bot.catch`
 *    da yana `ctx.reply()` chaqirilardi — cheksiz xato. Endi barcha
 *    javoblar `safeReply` orqali.
 */

// ═══════════════════════ Anti-spam sozlamalari ═══════════════════════
const BURST_WINDOW_MS = 1000;      // 1 sekundlik oyna
const BURST_LIMIT = 8;             // Oynada maksimal 8 ta so'rov
const MINUTE_LIMIT = 90;           // Daqiqada maksimal 90 ta so'rov
const COOLDOWN_SECONDS = 5;        // Qulay 5 soniyalik cooldown (foydalanuvchini cho'chitmaslik uchun)
const WARN_COOLDOWN_MS = 8_000;    // Ogohlantirishni takrorlash oralig'i

const rateBuckets = new NodeCache({ stdTTL: 120, checkperiod: 60, useClones: false, maxKeys: 50_000 });
const cooldowns = new NodeCache({ stdTTL: COOLDOWN_SECONDS, checkperiod: 15, maxKeys: 50_000 });
const warnedAt = new NodeCache({ stdTTL: 60, checkperiod: 30, maxKeys: 50_000 });

const VIP_PROMOS = [
    "🚀 <b>Kinolarni telefoningizga yuklab olmoqchimisiz?</b>\n\n💎 VIP obuna bo'ling — barcha kinolar cheklovsiz!",
    "⭐️ <b>Sevimli kinolaringizni saqlab qo'ymoqchimisiz?</b>\n\n💎 VIP bilan sevimlilar va ko'rish tarixi ochiladi.",
    "🎬 <b>Sharh qoldirib, boshqalarning fikrini o'qing!</b>\n\n💎 Bu imkoniyat VIP obunachilar uchun.",
];

/** Javob berishga urinadi, xatolikni yutadi (bloklangan chatlar uchun) */
const safeReply = (ctx, text, extra) => ctx.reply(text, extra).catch(() => null);

/**
 * Anti-spam tekshiruvi.
 * @returns {'ok' | 'silent' | 'warn'}
 */
const checkRateLimit = (userId) => {
    if (cooldowns.get(userId)) return 'silent';

    const now = Date.now();
    let bucket = rateBuckets.get(userId);

    if (!bucket) {
        bucket = { burstStart: now, burstCount: 0, minuteStart: now, minuteCount: 0 };
        rateBuckets.set(userId, bucket);
    }

    // Sekundlik oyna
    if (now - bucket.burstStart > BURST_WINDOW_MS) {
        bucket.burstStart = now;
        bucket.burstCount = 0;
    }
    bucket.burstCount += 1;

    // Daqiqalik oyna
    if (now - bucket.minuteStart > 60_000) {
        bucket.minuteStart = now;
        bucket.minuteCount = 0;
    }
    bucket.minuteCount += 1;

    if (bucket.burstCount > BURST_LIMIT || bucket.minuteCount > MINUTE_LIMIT) {
        cooldowns.set(userId, true);
        rateBuckets.del(userId);

        if (warnedAt.get(userId)) return 'silent';
        warnedAt.set(userId, now, WARN_COOLDOWN_MS / 1000);
        return 'warn';
    }

    return 'ok';
};

/** Muddati tugagan vaqtinchalik banni avtomatik olib tashlaydi */
const resolveBan = async (user) => {
    if (!user?.isBanned) return false;

    if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
        await setBanned(user.telegramId, false).catch(() => {});
        user.isBanned = false;
        user.bannedUntil = null;
        return false;
    }
    return true;
};

export const authMiddleware = async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return next();

    const userId = ctx.from.id;
    const envAdmin = isAdmin(userId);

    // ═══ 1. Anti-spam (adminlar uchun o'tkazib yuboriladi) ═══
    if (!envAdmin) {
        const verdict = checkRateLimit(userId);
        if (verdict === 'warn') {
            if (ctx.updateType === 'callback_query') {
                await ctx.answerCbQuery(`⚠️ Juda tez! ${COOLDOWN_SECONDS} soniya kuting.`, { show_alert: true }).catch(() => {});
            } else {
                await safeReply(ctx, `⚠️ <b>Juda ko'p so'rov!</b>\n\nIltimos, ${COOLDOWN_SECONDS} soniya kutib turing.`, { parse_mode: 'HTML' });
            }
            return;
        }
        if (verdict === 'silent') return;
    }

    // ═══ 2. Foydalanuvchini yuklash ═══
    let user = null;
    try {
        user = await findOrCreateUser(ctx);
    } catch (error) {
        logger.error('authMiddleware findOrCreateUser:', error);
    }

    // ═══ 3. Kontekstni tayyorlash (DB ishlamasa ham bot ishlashda davom etadi) ═══
    if (!ctx.session) ctx.session = {};
    ctx.session.user = user;

    ctx.t = createTranslator(user?.language || 'uz');
    ctx.isAdmin = envAdmin || user?.role === 'admin' || user?.role === 'superadmin';
    ctx.isSuperAdmin = envAdmin;
    // Adminlar barcha VIP funksiyalardan foydalanadi
    ctx.isVip = () => ctx.isAdmin || isVipUser(user);

    ctx.showVipPromo = async () => {
        if (ctx.isVip()) return;
        const promo = VIP_PROMOS[Math.floor(Math.random() * VIP_PROMOS.length)];
        await safeReply(ctx, promo, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('💎 VIP Olish', 'vip_info')]]),
        });
    };

    if (!user) return next(); // DB yiqilgan — cheklovlarsiz o'tkazamiz

    // ═══ 4. Ban tekshiruvi (adminlar ban bo'lmaydi) ═══
    if (!ctx.isAdmin && (await resolveBan(user))) {
        const until = user.bannedUntil
            ? `\n🕐 Blokdan chiqish: <b>${new Date(user.bannedUntil).toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</b>`
            : '';
        if (ctx.updateType === 'callback_query') {
            await ctx.answerCbQuery('🚫 Siz bloklangansiz.', { show_alert: true }).catch(() => {});
        } else {
            await safeReply(ctx, `🚫 <b>Siz botdan foydalanishdan chetlatilgansiz.</b>${until}\n\n<i>Qo'shimcha savollar bo'lsa qo'llab-quvvatlashga yozing: @${config.supportUsername}</i>`, { parse_mode: 'HTML' });
        }
        return;
    }

    // ═══ 5. Majburiy obuna (VIP lar va adminlar uchun o'tkazib yuboriladi) ═══
    // Scene ichida (admin wizardlari) va callbacklarda tekshirmaymiz —
    // `check_subscription` tugmasi start.js da alohida ishlanadi.
    const skipSubCheck =
        ctx.isAdmin ||
        ctx.isVip() ||
        ctx.updateType === 'callback_query' ||
        ctx.updateType === 'pre_checkout_query' ||
        ctx.updateType === 'inline_query' ||
        Boolean(ctx.session?.__scenes?.current);

    if (!skipSubCheck) {
        try {
            const status = await checkSubscription(ctx);
            if (status !== true && Array.isArray(status) && status.length > 0) {
                const buttons = status.map((channel) => [
                    Markup.button.url(
                        `📢 ${channel.name}`,
                        /^https?:\/\//i.test(channel.inviteLink) ? channel.inviteLink : `https://${channel.inviteLink}`
                    ),
                ]);
                buttons.push([Markup.button.callback(ctx.t('sub_btn_check'), 'check_subscription')]);

                // Kino kodi yuborilgan bo'lsa — obunadan keyin avtomatik yuborish uchun eslab qolamiz
                const text = ctx.message?.text?.trim();
                if (text && /^\d{1,7}$/.test(text)) ctx.session.pendingMovieCode = Number(text);

                await safeReply(ctx, ctx.t('sub_check_msg'), {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard(buttons),
                });
                return;
            }
        } catch (error) {
            logger.error('authMiddleware subscription:', error);
            // Xatolikda foydalanuvchini to'smaslik
        }
    }

    return next();
};

/** Admin-only handlerlar uchun middleware */
export const adminMiddleware = async (ctx, next) => {
    if (!ctx.isAdmin) {
        if (ctx.updateType === 'callback_query') {
            await ctx.answerCbQuery('❌ Ruxsat yo\'q').catch(() => {});
        }
        return;
    }
    return next();
};

/** Ban holatini tashqaridan o'zgartirganda keshlarni tozalash uchun */
export const resetUserCaches = (telegramId) => {
    invalidateUserCache(telegramId);
    invalidateUserSubscription(telegramId);
    rateBuckets.del(telegramId);
    cooldowns.del(telegramId);
};

export default authMiddleware;
