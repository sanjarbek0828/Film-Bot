import Movie from '../models/Movie.js';
import logger from '../utils/logger.js';
import cache, { TTL } from '../utils/cache.js';

/**
 * Kino xizmati (movie service).
 *
 * Muhim tuzatishlar:
 *  - Kesh invalidatsiyasi endi to'liq: `genre_*`, `search_*`, `top_*` ham tozalanadi
 *    (avval bu kalitlar hech qachon o'chirilmagani uchun admin kino qo'shsa ham
 *    janr ro'yxati 5 daqiqagacha eski holatda qolardi).
 *  - `searchMovies` regex injeksiyasiga qarshi himoyalangan.
 *  - Barcha ro'yxat so'rovlari `.lean()` va aniq `select` bilan (2-3x tezroq).
 *  - Sahifalash DB darajasida (avval butun natija xotiraga olinardi).
 */

const LIST_FIELDS = 'code title poster genre year views ratingSum ratingCount createdAt';

/** Regex metasimvollarini zararsizlantiradi (ReDoS / injection himoyasi) */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Kino ma'lumotlari o'zgarganda barcha bog'liq keshni tozalaydi */
export const invalidateMovieCaches = (code) => {
    if (code !== undefined && code !== null) cache.del(`movie:${code}`);
    cache.delByPrefix('movies:', 'genre:', 'search:', 'top:', 'stats:');
};

export const createMovie = async (movieData) => {
    const movie = await Movie.create(movieData);
    invalidateMovieCaches(movie.code);
    return movie;
};

export const getMovieByCode = async (code) => {
    const numericCode = Number(code);
    if (!Number.isFinite(numericCode)) return null;

    try {
        return await cache.remember(`movie:${numericCode}`, TTL.LONG, () =>
            Movie.findOne({ code: numericCode }).lean()
        );
    } catch (error) {
        logger.error('getMovieByCode:', error);
        return null;
    }
};

/**
 * Kino qidiruvi: matnli indeks (relevantlik bo'yicha) → prefiks regex → kod.
 * @returns {Promise<Array>}
 */
export const searchMovies = async (query, limit = 50) => {
    const term = String(query ?? '').trim();
    if (term.length === 0) return [];

    const cacheKey = `search:${term.toLowerCase().slice(0, 40)}:${limit}`;

    try {
        return await cache.remember(cacheKey, TTL.MEDIUM, async () => {
            // 1) To'liq matnli qidiruv — eng relevant natijalar
            let movies = await Movie.find(
                { $text: { $search: term } },
                { score: { $meta: 'textScore' }, ...selectToProjection(LIST_FIELDS) }
            )
                .sort({ score: { $meta: 'textScore' }, views: -1 })
                .limit(limit)
                .lean();

            // 2) Natija bo'sh bo'lsa — qism-so'z (substring) qidiruvi
            if (movies.length === 0) {
                const safe = escapeRegex(term);
                movies = await Movie.find({ title: { $regex: safe, $options: 'i' } })
                    .select(LIST_FIELDS)
                    .sort({ views: -1 })
                    .limit(limit)
                    .lean();
            }

            // 3) Hali ham bo'sh va raqam kiritilgan bo'lsa — kod bo'yicha
            if (movies.length === 0 && /^\d+$/.test(term)) {
                const byCode = await Movie.findOne({ code: Number(term) }).select(LIST_FIELDS).lean();
                if (byCode) movies = [byCode];
            }

            return movies;
        });
    } catch (error) {
        logger.error('searchMovies:', error);
        return [];
    }
};

/** `select` string ini `find()` projection obyektiga aylantiradi */
const selectToProjection = (fields) =>
    fields.split(/\s+/).filter(Boolean).reduce((acc, field) => ({ ...acc, [field]: 1 }), {});

export const deleteMovie = async (code) => {
    try {
        const deleted = await Movie.findOneAndDelete({ code: Number(code) }).lean();
        invalidateMovieCaches(code);
        return deleted;
    } catch (error) {
        logger.error('deleteMovie:', error);
        return null;
    }
};

export const updateMovie = async (code, data) => {
    try {
        const updated = await Movie.findOneAndUpdate({ code: Number(code) }, data, { new: true }).lean();
        invalidateMovieCaches(code);
        return updated;
    } catch (error) {
        logger.error('updateMovie:', error);
        return null;
    }
};

export const getNewMovies = async (limit = 10) => {
    try {
        const pool = await cache.remember('movies:new', TTL.MEDIUM, () =>
            Movie.find().select(LIST_FIELDS).sort({ createdAt: -1 }).limit(30).lean()
        );
        return pool.slice(0, limit);
    } catch (error) {
        logger.error('getNewMovies:', error);
        return [];
    }
};

export const getTopMovies = async (limit = 10) => {
    try {
        const pool = await cache.remember('top:movies', TTL.LONG, () =>
            Movie.find().select(LIST_FIELDS).sort({ views: -1 }).limit(30).lean()
        );
        return pool.slice(0, limit);
    } catch (error) {
        logger.error('getTopMovies:', error);
        return [];
    }
};

/** WebApp katalogi uchun yengil ro'yxat (sahifalangan) */
export const getMoviesPage = async ({ page = 1, limit = 40, genre, search, sort = 'new' } = {}) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 40));
    const skip = (safePage - 1) * safeLimit;

    const filter = {};
    if (genre && genre !== 'all') filter.genre = { $regex: escapeRegex(genre), $options: 'i' };
    if (search) {
        const clean = String(search).trim();
        if (/^\d+$/.test(clean)) {
            filter.$or = [
                { code: Number(clean) },
                { title: { $regex: escapeRegex(clean), $options: 'i' } },
            ];
        } else {
            filter.title = { $regex: escapeRegex(clean), $options: 'i' };
        }
    }

    const sortMap = {
        new: { createdAt: -1 },
        top: { views: -1 },
        rating: { ratingSum: -1 },
        year: { year: -1 },
    };

    const cacheKey = `movies:page:${safePage}:${safeLimit}:${genre || 'all'}:${search || ''}:${sort}`;

    try {
        return await cache.remember(cacheKey, TTL.MEDIUM, async () => {
            const [items, total] = await Promise.all([
                Movie.find(filter)
                    .select(LIST_FIELDS)
                    .sort(sortMap[sort] || sortMap.new)
                    .skip(skip)
                    .limit(safeLimit)
                    .lean(),
                Movie.countDocuments(filter),
            ]);

            return {
                items,
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.max(1, Math.ceil(total / safeLimit)),
                hasMore: skip + items.length < total,
            };
        });
    } catch (error) {
        logger.error('getMoviesPage:', error);
        return { items: [], total: 0, page: safePage, limit: safeLimit, totalPages: 1, hasMore: false };
    }
};

/** Mavjud janrlar (kino soni bilan) — WebApp filtri va bot menyusi uchun */
export const getGenres = async () => {
    try {
        return await cache.remember('genre:list', TTL.LONG, async () => {
            const rows = await Movie.aggregate([
                { $match: { genre: { $nin: [null, '', 'Noma\'lum'] } } },
                { $project: { genres: { $split: ['$genre', ','] } } },
                { $unwind: '$genres' },
                { $project: { genre: { $trim: { input: '$genres' } } } },
                { $match: { genre: { $ne: '' } } },
                { $group: { _id: '$genre', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 30 },
            ]);
            return rows.map((row) => ({ name: row._id, count: row.count }));
        });
    } catch (error) {
        logger.error('getGenres:', error);
        return [];
    }
};

/** Janr bo'yicha sahifalangan ro'yxat (bot uchun) */
export const getMoviesByGenre = async (genre, page = 1, limit = 10) => {
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * limit;
    const filter = { genre: { $regex: escapeRegex(genre), $options: 'i' } };

    try {
        return await cache.remember(`genre:${genre}:${safePage}:${limit}`, TTL.LONG, async () => {
            const [items, total] = await Promise.all([
                Movie.find(filter).select(LIST_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
                Movie.countDocuments(filter),
            ]);
            return { items, total, page: safePage, totalPages: Math.max(1, Math.ceil(total / limit)) };
        });
    } catch (error) {
        logger.error('getMoviesByGenre:', error);
        return { items: [], total: 0, page: safePage, totalPages: 1 };
    }
};

export const countMovies = async () => {
    try {
        return await cache.remember('stats:movieCount', TTL.LONG, () => Movie.estimatedDocumentCount());
    } catch (error) {
        logger.error('countMovies:', error);
        return 0;
    }
};

/** Tasodifiy kino — `$sample` bilan (butun kolleksiyani o'qimaydi) */
export const getRandomMovie = async () => {
    try {
        const [movie] = await Movie.aggregate([{ $sample: { size: 1 } }]);
        return movie || null;
    } catch (error) {
        logger.error('getRandomMovie:', error);
        return null;
    }
};

/** Keyingi bo'sh kino kodini qaytaradi */
export const getNextMovieCode = async () => {
    try {
        const last = await Movie.findOne().sort({ code: -1 }).select('code').lean();
        return last ? last.code + 1 : 1001;
    } catch (error) {
        logger.error('getNextMovieCode:', error);
        return Date.now() % 100000;
    }
};

/** Ko'rishlar sonini oshiradi (natijani kutmasdan) */
export const incrementViews = (movieId) => {
    if (!movieId) return;
    Movie.updateOne({ _id: movieId }, { $inc: { views: 1 } }).catch(() => {});
};

// Eski nomlar bilan moslik (backward compatibility)
export const getAllMovies = () => getNewMovies(20);
export const getAllMoviesLite = async () => {
    const { items } = await getMoviesPage({ page: 1, limit: 100 });
    return items;
};
