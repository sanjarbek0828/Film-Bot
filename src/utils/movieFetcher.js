import logger from '../utils/logger.js';

/**
 * iTunes Search API orqali kino metama'lumotlarini topadi (bepul, token kerak emas).
 *
 * Muhim tuzatishlar:
 *  - Eski `https.get` da TIMEOUT yo'q edi: API javob bermasa, admin "Kino
 *    qidirilmoqda..." xabarida abadiy qotib qolardi. Endi 8 sekundlik timeout.
 *  - `fetch` (Node 18+ native) ishlatiladi — kod ancha sodda.
 *  - Bir nechta natijadan eng mosini tanlaydi (nom o'xshashligi bo'yicha).
 */

const TIMEOUT_MS = 8000;

/** Poster URL sifatini oshiradi: 100x100 → 600x900 */
const upgradeArtwork = (url) => {
    if (!url) return null;
    return url.replace(/\/\d+x\d+bb\./, '/600x900bb.');
};

/** Sodda o'xshashlik bahosi (0..1) — qidirilgan nom bilan solishtiradi */
const similarity = (a, b) => {
    const x = String(a).toLowerCase().trim();
    const y = String(b).toLowerCase().trim();
    if (x === y) return 1;
    if (y.includes(x) || x.includes(y)) return 0.8;
    const wordsX = new Set(x.split(/\s+/));
    const wordsY = y.split(/\s+/);
    const matches = wordsY.filter((word) => wordsX.has(word)).length;
    return wordsY.length > 0 ? matches / Math.max(wordsX.size, wordsY.length) : 0;
};

export const searchMovie = async (title) => {
    const term = String(title ?? '').trim();
    if (term.length === 0) return null;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=movie&limit=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'FilmXBot/2.0' },
        });

        if (!response.ok) {
            logger.debug(`iTunes API status ${response.status}`);
            return null;
        }

        const json = await response.json();
        if (!json?.resultCount) return null;

        // Eng mos natijani tanlaymiz
        const best = json.results
            .map((item) => ({ item, score: similarity(term, item.trackName || '') }))
            .sort((a, b) => b.score - a.score)[0]?.item;

        if (!best) return null;

        const poster = upgradeArtwork(best.artworkUrl100);
        if (!poster) return null;

        return {
            title: best.trackName,
            year: best.releaseDate ? new Date(best.releaseDate).getFullYear() : null,
            genre: best.primaryGenreName || 'Kino',
            poster,
            description: (best.longDescription || best.shortDescription || '').slice(0, 900),
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.debug('iTunes API timeout');
        } else {
            logger.debug('iTunes API error:', error.message);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

export default searchMovie;
