import NodeCache from 'node-cache';
import logger from './logger.js';

/**
 * Markazlashgan kesh (cache) qatlami.
 *
 * Eski kod har bir joyda `myCache.del('...')` ni qo'lda yozgani uchun
 * kesh tez-tez eskirib qolar edi (masalan `genre_*` va `search_*` hech qachon
 * tozalanmagan). Bu versiya prefiks bo'yicha guruh-tozalashni qo'llaydi.
 */

const store = new NodeCache({
    stdTTL: 120,
    checkperiod: 120,
    useClones: false, // Nusxa olmaslik — katta ro'yxatlarda ancha tezroq
    maxKeys: 5000,    // Xotira oqishidan (memory leak) himoya
});

export const TTL = {
    SHORT: 30,
    MEDIUM: 120,
    LONG: 300,
    HOUR: 3600,
};

export const get = (key) => {
    try {
        return store.get(key);
    } catch {
        return undefined;
    }
};

export const set = (key, value, ttl = TTL.MEDIUM) => {
    try {
        return store.set(key, value, ttl);
    } catch (e) {
        // maxKeys limitiga yetganda eng eski kalitlarni tozalab qayta urinamiz
        logger.debug('Cache set failed, flushing oldest keys:', e.message);
        store.flushAll();
        try { return store.set(key, value, ttl); } catch { return false; }
    }
};

export const del = (...keys) => store.del(keys.flat());

/** Berilgan prefikslar bilan boshlanadigan barcha kalitlarni o'chiradi */
export const delByPrefix = (...prefixes) => {
    const flat = prefixes.flat();
    if (flat.length === 0) return 0;
    const matched = store.keys().filter((key) => flat.some((prefix) => key.startsWith(prefix)));
    return matched.length > 0 ? store.del(matched) : 0;
};

/**
 * Kesh yordamida bir marta hisoblaydi (cache-aside pattern).
 * Bir vaqtda kelgan bir xil so'rovlarni birlashtiradi (in-flight deduplication),
 * shuning uchun "cache stampede" muammosi bo'lmaydi.
 */
const inflight = new Map();

export const remember = async (key, ttl, producer) => {
    const cached = store.get(key);
    if (cached !== undefined) return cached;

    if (inflight.has(key)) return inflight.get(key);

    const promise = (async () => {
        try {
            const value = await producer();
            if (value !== undefined && value !== null) set(key, value, ttl);
            return value;
        } finally {
            inflight.delete(key);
        }
    })();

    inflight.set(key, promise);
    return promise;
};

export const flushAll = () => {
    store.flushAll();
    inflight.clear();
};

export const stats = () => ({ ...store.getStats(), keys: store.keys().length });

const cache = { get, set, del, delByPrefix, remember, flushAll, stats, TTL };

export default cache;
