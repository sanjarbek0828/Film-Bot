import config from '../config/env.js';

/**
 * Super Admin (ENV asosidagi) tekshiruvi.
 * Har chaqirilishda `process.env` ni parse qilmaydi — Set orqali O(1).
 */
export const isAdmin = (userId) => {
    if (userId === undefined || userId === null) return false;
    const id = typeof userId === 'number' ? userId : parseInt(String(userId).trim(), 10);
    if (!Number.isFinite(id)) return false;
    return config.adminIdSet.has(id);
};

/** DB roli yoki ENV bo'yicha admin ekanligini aniqlaydi */
export const isAdminUser = (user, telegramId) => {
    if (isAdmin(telegramId ?? user?.telegramId)) return true;
    return user?.role === 'admin' || user?.role === 'superadmin';
};

/** ENV dagi barcha super adminlar ro'yxati */
export const getAdminIds = () => [...config.adminIds];

/** Xabar yuborish uchun asosiy admin */
export const getPrimaryAdminId = () => config.primaryAdminId;

export default isAdmin;
