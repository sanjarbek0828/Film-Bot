import crypto from 'crypto';
import config from '../config/env.js';

/**
 * Telegram Mini App `initData` ni tekshiradi.
 *
 * Bu ELON MUHIM: eski `/api/favorites/*` endpointlari `userId` ni shunchaki
 * request body dan olardi — ya'ni har kim boshqa foydalanuvchining sevimlilarini
 * o'qishi va o'zgartirishi mumkin edi. Endi imzo (HMAC) tekshiriladi.
 *
 * Algoritm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

const MAX_AGE_SECONDS = 24 * 60 * 60; // initData 24 soatdan keyin eskiradi

let cachedSecret = null;
const getSecretKey = () => {
    if (!cachedSecret) {
        cachedSecret = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
    }
    return cachedSecret;
};

const safeEqual = (a, b) => {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * @param {string} initData  `window.Telegram.WebApp.initData` qiymati
 * @returns {{ ok: boolean, user?: object, reason?: string }}
 */
export const verifyInitData = (initData) => {
    if (!initData || typeof initData !== 'string') return { ok: false, reason: 'missing' };
    if (!config.botToken) return { ok: false, reason: 'bot_token_missing' };

    let params;
    try {
        params = new URLSearchParams(initData);
    } catch {
        return { ok: false, reason: 'malformed' };
    }

    const hash = params.get('hash');
    if (!hash) return { ok: false, reason: 'no_hash' };

    params.delete('hash');
    params.delete('signature'); // Telegram yangi qo'shgan maydon, hash hisobiga kirmaydi

    const dataCheckString = [...params.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n');

    const computed = crypto.createHmac('sha256', getSecretKey()).update(dataCheckString).digest('hex');
    if (!safeEqual(computed, hash)) return { ok: false, reason: 'bad_signature' };

    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate)) return { ok: false, reason: 'no_auth_date' };
    if (Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) return { ok: false, reason: 'expired' };

    let user = null;
    try {
        const rawUser = params.get('user');
        if (rawUser) user = JSON.parse(rawUser);
    } catch {
        return { ok: false, reason: 'bad_user' };
    }
    if (!user?.id) return { ok: false, reason: 'no_user' };

    return { ok: true, user, authDate };
};

/**
 * Express middleware: `X-Telegram-Init-Data` sarlavhasini tekshirib
 * `req.telegramUser` ga yozadi.
 */
export const requireTelegramAuth = (req, res, next) => {
    const initData = req.get('X-Telegram-Init-Data') || req.body?.initData || req.query?.initData;
    const result = verifyInitData(initData);

    if (!result.ok) {
        return res.status(401).json({ error: 'unauthorized', reason: result.reason });
    }

    req.telegramUser = result.user;
    return next();
};

export default { verifyInitData, requireTelegramAuth };
