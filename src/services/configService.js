import Config from '../models/Config.js';
import cache, { TTL } from '../utils/cache.js';
import logger from '../utils/logger.js';

/**
 * Konfiguratsiya xizmati (DB dagi sozlamalar).
 *
 * Eski kodda `Config.findOne()` har `/start` da chaqirilardi va turli
 * fayllarda alohida keshlar bor edi — admin sozlamani o'zgartirganda
 * ba'zi keshlar 5 daqiqagacha eskirib qolardi. Endi bitta markazlashgan joy.
 */

const key = (name) => `config:${name}`;

export const getConfig = async (name, fallback = null) => {
    try {
        const value = await cache.remember(key(name), TTL.LONG, async () => {
            const row = await Config.findOne({ key: name }).lean();
            // `null` keshlanmaydi, shuning uchun maxsus belgi qo'yamiz
            return row?.value ?? '__EMPTY__';
        });
        return value === '__EMPTY__' ? fallback : value;
    } catch (error) {
        logger.error(`getConfig(${name}):`, error);
        return fallback;
    }
};

export const setConfig = async (name, value) => {
    try {
        await Config.findOneAndUpdate({ key: name }, { value }, { upsert: true, new: true });
        cache.del(key(name));
        return true;
    } catch (error) {
        logger.error(`setConfig(${name}):`, error);
        return false;
    }
};

export const deleteConfig = async (name) => {
    try {
        await Config.deleteOne({ key: name });
        cache.del(key(name));
        return true;
    } catch {
        return false;
    }
};

/** JSON sifatida saqlangan sozlamani xavfsiz o'qiydi */
export const getJsonConfig = async (name, fallback = null) => {
    const raw = await getConfig(name);
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

export const setJsonConfig = (name, value) => setConfig(name, JSON.stringify(value));

export const CONFIG_KEYS = {
    START_GIF: 'START_GIF',
    AUTO_POST_ENABLED: 'AUTO_POST_ENABLED',
    CHANNEL_ID: 'CHANNEL_ID',
    LATEST_GLOBAL_VIP: 'LATEST_GLOBAL_VIP',
    SUBSCRIPTION_ENABLED: 'subscription_enabled',
};

export default { getConfig, setConfig, deleteConfig, getJsonConfig, setJsonConfig, CONFIG_KEYS };
