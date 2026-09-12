import { Markup } from 'telegraf';
import User from '../models/User.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { getMovieByCode } from '../services/movieService.js';
import { getJsonConfig, CONFIG_KEYS } from '../services/configService.js';
import { checkSubscription, invalidateUserSubscription } from '../services/subscriptionService.js';
import { extendVip, updateUser } from '../services/userService.js';
import { createTranslator, SUPPORTED_LANGUAGES } from '../utils/locales.js';
import { sendMainMenu, buildSettingsKeyboard, menuMatcher, isVipUser } from '../utils/menuUtils.js';
import { sendMovie } from '../bot/sendMovie.js';

const DEFAULT_START_TEXT =
    `🎬 <b>FilmX botiga xush kelibsiz!</b>\n\n` +
    `🔍 <b>Kino topish juda oson:</b>\n` +
    `├ 🔢 Kino <b>kodini</b> yuboring (masalan: <code>1025</code>)\n` +
    `├ 📝 Yoki kino <b>nomini</b> yozing (masalan: <i>Venom</i>)\n` +
    `└ 🌐 Yoki <b>«🎬 Katalog»</b> orqali qulay tanlang\n\n` +
    `👇 Boshlash uchun menyudan foydalaning:`;

/** start payload: referral (uzun raqam) yoki kino kodi (qisqa raqam yoki kino_123) */
const parseStartPayload = (payload, selfId) => {
    if (!payload) return {};
    const clean = String(payload).trim();

    // kino_123 yoki movie_123 formatlari
    const prefixMatch = clean.match(/^(?:kino|movie|code)_?(\d+)$/i);
    if (prefixMatch) {
        return { movieCode: parseInt(prefixMatch[1], 10) };
    }

    if (!/^\d+$/.test(clean)) return {};

    // 8 yoki undan ko'p xonali raqamlar — referral Telegram ID
    if (clean.length >= 8) {
        return clean !== String(selfId) ? { referrerId: clean } : {};
    }

    return { movieCode: parseInt(clean, 10) };
};

/** Yangi foydalanuvchi uchun referral mukofoti + aksiya VIP */
const handleNewUserBonuses = async (ctx, user, referrerId) => {
    // Aksiya (global) VIP — ro'yxatdan o'tganda avtomatik sovg'a
    try {
        const action = await getJsonConfig(CONFIG_KEYS.LATEST_GLOBAL_VIP);
        if (action?.targetDate && action.targetDate > Date.now()) {
            await updateUser(user.telegramId, { $set: { vipUntil: new Date(action.targetDate) } });
        }
    } catch (error) {
        logger.debug('Global VIP gift skip:', error.message);
    }

    if (!referrerId) return;

    try {
        const referrer = await User.findOneAndUpdate(
            { telegramId: parseInt(referrerId, 10) },
            { $inc: { referralCount: 1 } },
            { new: true }
        );
        if (!referrer) return;

        if (referrer.referralCount % 10 === 0) {
            await extendVip(referrer.telegramId, 1, 'referral');
            ctx.telegram
                .sendMessage(referrer.telegramId, ctx.t('referral_milestone'), { parse_mode: 'HTML' })
                .catch(() => {});
        } else {
            const left = 10 - (referrer.referralCount % 10);
            ctx.telegram
                .sendMessage(
                    referrer.telegramId,
                    ctx.t('referral_progress', { count: referrer.referralCount, left }),
                    { parse_mode: 'HTML' }
                )
                .catch(() => {});
        }
    } catch (error) {
        logger.debug('Referral bonus skip:', error.message);
    }
};

/** START_GIF sozlamasi bo'lsa uni, aks holda standart matnni yuboradi */
const sendWelcome = async (ctx) => {
    const welcomeFallback = ctx.t
        ? ctx.t('welcome', { name: escapeHtml(ctx.from?.first_name || 'Foydalanuvchi') })
        : DEFAULT_START_TEXT;

    try {
        const gif = await getJsonConfig(CONFIG_KEYS.START_GIF);
        if (gif?.fileId && gif?.type) {
            const caption = gif.caption || welcomeFallback;
            const opts = { caption, parse_mode: 'HTML' };
            if (gif.type === 'animation') return void (await ctx.replyWithAnimation(gif.fileId, opts));
            if (gif.type === 'photo') return void (await ctx.replyWithPhoto(gif.fileId, opts));
            if (gif.type === 'video') return void (await ctx.replyWithVideo(gif.fileId, opts));
        }
    } catch (error) {
        logger.debug('START_GIF skip:', error.message);
    }
    await ctx.reply(welcomeFallback, { parse_mode: 'HTML' }).catch(() => {});
};

export const setupStartCommand = (bot) => {
    // ═══ /help ═══
    bot.command('help', async (ctx) => {
        if (ctx.session?.__scenes?.current) await ctx.scene.leave().catch(() => {});
        await ctx.reply(
            `ℹ️ <b>Yordam va qo'llanma</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🔍 <b>Kino qidirish usullari:</b>\n` +
            `├ 🔢 Kino <b>kodini</b> yuboring (masalan: <code>1025</code>)\n` +
            `├ 📝 Kino <b>nomini</b> yozing (masalan: <i>Venom</i>)\n` +
            `└ 🌐 Yoki <b>«🎬 Katalog»</b> orqali qulay tanlang\n\n` +
            `⚡️ <b>Foydali buyruqlar:</b>\n` +
            `├ /start — Botni yangilash / bosh menyu\n` +
            `├ /promo — Promokod kiritish va sovg'a olish\n` +
            `├ /request — Botga yangi film so'rash\n` +
            `├ /support — Texnik yordam bilan bog'lanish\n` +
            `└ /help — Ushbu yordam oynasi\n\n` +
            `💎 <b>VIP obuna imkoniyatlari:</b>\n` +
            `Kinolarni to'g'ridan-to'g'ri yuklab olish, sharhlar yozish va majburiy obunasiz tomosha qilish imkonini beradi.`,
            { parse_mode: 'HTML' }
        ).catch(() => {});
    });

    // ═══ /support ═══
    bot.command('support', async (ctx) => {
        if (ctx.session?.__scenes?.current) await ctx.scene.leave().catch(() => {});
        await ctx.reply(
            `📞 <b>Qo'llab-quvvatlash</b>\n\nSavol yoki muammo bo'lsa yozing:`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.url('📞 Adminga yozish', `https://t.me/${config.supportUsername}`)]]),
            }
        ).catch(() => {});
    });

    // ═══ /start ═══
    bot.start(async (ctx) => {
        try {
            const payload = ctx.message?.text?.split(' ')[1];
            const { referrerId, movieCode } = parseStartPayload(payload, ctx.from.id);

            let user = ctx.session?.user;
            const isNewUser = !user?._id;

            // Middleware topolmagan bo'lsa yoki yangi bo'lsa — yaratamiz
            if (!user?.telegramId) {
                user = await User.findOne({ telegramId: ctx.from.id });
            }
            if (!user) {
                user = await User.create({
                    telegramId: ctx.from.id,
                    firstName: ctx.from.first_name,
                    username: ctx.from.username,
                    language: 'uz',
                    invitedBy: referrerId || null,
                });
                ctx.t = createTranslator(user.language);
                await handleNewUserBonuses(ctx, user, referrerId);
            }

            if (!ctx.session) ctx.session = {};
            ctx.session.user = user;
            ctx.t = createTranslator(user.language || 'uz');

            // ═══ Obuna tekshiruvi (deeplink bilan kelishi mumkin) ═══
            const skipSubCheck = ctx.isAdmin || (ctx.isVip ? ctx.isVip() : isVipUser(user));
            if (!skipSubCheck) {
                const status = await checkSubscription(ctx);
                if (status !== true && Array.isArray(status) && status.length > 0) {
                    if (movieCode) ctx.session.pendingMovieCode = movieCode;
                    const buttons = status.map((ch) => [
                        Markup.button.url(`📢 ${ch.name}`, /^https?:\/\//i.test(ch.inviteLink) ? ch.inviteLink : `https://${ch.inviteLink}`),
                    ]);
                    buttons.push([Markup.button.callback(ctx.t('sub_btn_check'), 'check_subscription')]);
                    return ctx.reply(ctx.t('sub_check_msg'), { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
                }
            }

            // ═══ Deeplink kino ═══
            if (movieCode) {
                const movie = await getMovieByCode(movieCode);
                if (movie) {
                    await sendWelcome(ctx);
                    await sendMovie(ctx, movie, user);
                    return sendMainMenu(ctx, '👇 Quyidagi menyudan foydalaning:');
                }
            }

            await sendWelcome(ctx);
            return sendMainMenu(ctx);
        } catch (error) {
            logger.error('start:', error);
            await sendMainMenu(ctx).catch(() => {});
        }
    });

    // ═══ OBUNA TEKSHIRISH tugmasi ═══
    bot.action('check_subscription', async (ctx) => {
        try {
            invalidateUserSubscription(ctx.from.id);
            const status = await checkSubscription(ctx);
            if (status === true) {
                await ctx.answerCbQuery('✅').catch(() => {});
                await ctx.deleteMessage().catch(() => {});
                await ctx.reply(ctx.t('sub_success'), { parse_mode: 'HTML' });

                const code = ctx.session?.pendingMovieCode;
                if (code) {
                    ctx.session.pendingMovieCode = null;
                    const movie = await getMovieByCode(code);
                    if (movie) {
                        await sendMovie(ctx, movie, ctx.session?.user);
                        return sendMainMenu(ctx, '👇 Menyu:');
                    }
                }
                return sendMainMenu(ctx);
            }
            await ctx.answerCbQuery(ctx.t('sub_fail'), { show_alert: true });
        } catch (error) {
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });

    // ═══ TIL TANLASH ═══
    bot.hears(['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
        try {
            const text = ctx.message.text;
            const lang = text.includes('Русский') ? 'ru' : text.includes('English') ? 'en' : 'uz';
            if (!SUPPORTED_LANGUAGES.includes(lang)) return;

            await updateUser(ctx.from.id, { $set: { language: lang } });
            if (ctx.session?.user) ctx.session.user.language = lang;
            ctx.t = createTranslator(lang);

            await ctx.reply(ctx.t('lang_changed'), Markup.removeKeyboard());
            return sendMainMenu(ctx);
        } catch (error) {
            logger.error('language change:', error);
        }
    });

    // ═══ SOZLAMALAR ═══
    bot.hears(menuMatcher('menu_settings'), (ctx) =>
        ctx.reply(ctx.t('settings_title'), { parse_mode: 'HTML', ...buildSettingsKeyboard(ctx) }).catch(() => {})
    );

    // ═══ BOSH MENYU ═══
    bot.hears(menuMatcher('menu_main'), (ctx) => sendMainMenu(ctx));
};

export default setupStartCommand;
