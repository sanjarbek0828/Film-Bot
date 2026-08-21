import dotenv from 'dotenv';

dotenv.config();

/**
 * Markazlashgan, validatsiya qilingan konfiguratsiya.
 * Butun loyiha `process.env` ga to'g'ridan-to'g'ri murojaat qilmasligi kerak —
 * shu fayl yagona manba (single source of truth).
 */

const bool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const int = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** ADMIN_ID ni har qanday formatdan ("123, 456", '["123"]', "123\n456") tozalab oladi */
const parseAdminIds = (raw) => {
    if (!raw) return [];
    return String(raw)
        .replace(/['"[\]]/g, ' ')
        .split(/[\s,;]+/)
        .map((id) => id.trim())
        .filter((id) => /^\d+$/.test(id))
        .map((id) => Number(id));
};

const normalizeUrl = (url) => {
    if (!url) return null;
    let value = String(url).trim();
    if (!value) return null;
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, '');
};

const adminIds = parseAdminIds(process.env.ADMIN_ID);
const publicUrl = normalizeUrl(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL);

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',

    botToken: (process.env.BOT_TOKEN || '').trim(),
    mongoUri: (process.env.MONGODB_URI || '').trim(),

    port: int(process.env.PORT, 3000),
    publicUrl,
    webAppUrl: publicUrl ? `${publicUrl}/webapp` : null,

    adminIds,
    adminIdSet: new Set(adminIds),
    primaryAdminId: adminIds[0] ?? null,

    supportUsername: (process.env.SUPPORT_USERNAME || 'sanjarbek_404').replace('@', '').trim(),
    channelId: (process.env.CHANNEL_ID || '').trim() || null,

    logLevel: (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase(),

    // Xatti-harakat sozlamalari
    trustProxy: bool(process.env.TRUST_PROXY, true),
    dropPendingUpdates: bool(process.env.DROP_PENDING_UPDATES, true),

    // VIP narxlari (Telegram Stars)
    vipPlans: {
        30: { days: 30, stars: int(process.env.VIP_STARS_30, 50), title: '1 Oylik VIP' },
        365: { days: 365, stars: int(process.env.VIP_STARS_365, 300), title: '1 Yillik VIP' },
    },
};

/** Bot ishga tushishidan oldin majburiy sozlamalarni tekshiradi */
export const assertConfig = () => {
    const errors = [];

    if (!config.botToken) errors.push('BOT_TOKEN majburiy (@BotFather dan oling)');
    else if (!/^\d+:[\w-]{30,}$/.test(config.botToken)) errors.push('BOT_TOKEN formati noto\'g\'ri');

    if (!config.mongoUri) errors.push('MONGODB_URI majburiy');
    else if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) errors.push('MONGODB_URI "mongodb://" yoki "mongodb+srv://" bilan boshlanishi kerak');

    if (config.adminIds.length === 0) errors.push('ADMIN_ID majburiy (@userinfobot dan oling). Masalan: ADMIN_ID=123456789,987654321');

    if (errors.length > 0) {
        throw new Error(`Konfiguratsiya xatosi:\n  - ${errors.join('\n  - ')}`);
    }
};

export default config;
