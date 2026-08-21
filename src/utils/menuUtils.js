import { Markup } from 'telegraf';
import config from '../config/env.js';
import logger from './logger.js';
import { getTranslation, SUPPORTED_LANGUAGES } from './locales.js';

/**
 * Menyu (klaviatura) yordamchilari.
 *
 * ENG MUHIM TUZATISH: eski kodda menyu tugmalari `ctx.t(...)` orqali
 * yaratilardi, lekin handlerlar `bot.hears(['🔍 Kino qidirish', ...])` kabi
 * QO'LDA yozilgan matnlar bilan tinglanardi. Natijada, masalan
 * `menu_search` = "🔍 Qidirish" bo'lsa-da, `user.js` da "🔍 Kino qidirish"
 * kutilardi — ya'ni ba'zi tugmalar bosilganda BOT UMUMAN JAVOB BERMASDI.
 *
 * Endi tugma matnlari faqat shu fayldan generatsiya qilinadi va
 * `menuMatcher()` barcha tillardagi variantlarni avtomatik tinglaydi.
 */

/** Bir menyu bandining barcha tillardagi matnlari */
export const menuTexts = (key) => SUPPORTED_LANGUAGES.map((lang) => getTranslation(lang, key));

/**
 * `bot.hears()` uchun barcha tillardagi matnlarni qaytaradi.
 * @param {...string} keys locales kalitlari
 */
export const menuMatcher = (...keys) => {
    const set = new Set();
    for (const key of keys) menuTexts(key).forEach((text) => set.add(text));
    return [...set];
};

/** Barcha menyu tugmalari matnlari — matn handleri ularni qidiruv deb o'ylamasligi uchun */
const MENU_KEYS = [
    'menu_main', 'menu_cabinet', 'menu_search', 'menu_category', 'menu_random',
    'menu_new', 'menu_fav', 'menu_top', 'menu_stats', 'menu_settings',
    'menu_vote', 'menu_history', 'menu_shop', 'menu_bonus', 'menu_invite',
    'menu_catalog', 'menu_recommend', 'menu_vip', 'menu_vip_status', 'cancel',
];

let reservedTextsCache = null;
export const getReservedTexts = () => {
    if (!reservedTextsCache) {
        reservedTextsCache = new Set(MENU_KEYS.flatMap(menuTexts));
        // Til tanlash tugmalari
        ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'].forEach((text) => reservedTextsCache.add(text));
    }
    return reservedTextsCache;
};

export const isReservedText = (text) => getReservedTexts().has(String(text ?? '').trim());

/** WebApp manzili (mahalliy ishga tushirishda tugma ko'rsatilmaydi, chunki Telegram HTTPS talab qiladi) */
export const getWebAppUrl = () => config.webAppUrl;

/** Asosiy klaviatura tuzilishi */
export const buildMainKeyboard = (ctx) => {
    const t = (key) => (ctx.t ? ctx.t(key) : getTranslation('uz', key));
    const rows = [];

    const webAppUrl = getWebAppUrl();
    if (webAppUrl) {
        rows.push([Markup.button.webApp(t('menu_catalog'), webAppUrl)]);
    }

    rows.push([t('menu_search'), t('menu_new')]);
    rows.push([t('menu_top'), t('menu_category')]);
    rows.push([t('menu_random'), t('menu_recommend')]);
    rows.push([t('menu_cabinet'), t('menu_settings')]);

    return Markup.keyboard(rows).resize();
};

/** Sozlamalar klaviaturasi */
export const buildSettingsKeyboard = (ctx) => {
    const t = (key) => (ctx.t ? ctx.t(key) : getTranslation('uz', key));
    return Markup.keyboard([
        ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'],
        [t('menu_main')],
    ]).resize();
};

/** Foydalanuvchi VIP ekanligini tekshiradi */
export const isVipUser = (user) => Boolean(user?.vipUntil && new Date(user.vipUntil) > new Date());

/** VIP tugashiga qolgan kunlar */
export const vipDaysLeft = (user) => {
    if (!isVipUser(user)) return 0;
    return Math.max(1, Math.ceil((new Date(user.vipUntil) - Date.now()) / 86_400_000));
};

/**
 * Asosiy menyuni yuboradi.
 * Xatolik yuz bersa ham hech qachon throw qilmaydi.
 */
export const sendMainMenu = async (ctx, customText) => {
    try {
        const user = ctx.session?.user;
        const t = (key, params) => (ctx.t ? ctx.t(key, params) : getTranslation('uz', key, params));

        let text = customText || t('welcome', { name: ctx.from?.first_name || 'do\'st' });

        if (isVipUser(user)) {
            text += `\n\n${t('vip_active_badge', { days: vipDaysLeft(user) })}`;
        }

        return await ctx.reply(text, {
            parse_mode: 'HTML',
            ...buildMainKeyboard(ctx),
        });
    } catch (error) {
        logger.error('sendMainMenu:', error);
        return ctx.reply('🏠 Bosh menyu', buildMainKeyboard(ctx)).catch(() => {});
    }
};

export default sendMainMenu;
