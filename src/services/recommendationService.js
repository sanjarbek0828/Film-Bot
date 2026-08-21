import Movie from '../models/Movie.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Tavsiya xizmati (recommendation).
 *
 * Muhim tuzatishlar:
 *  - `.populate('watchHistory.movie')` butun tarixni yuklab tashlardi; endi
 *    faqat oxirgi 20 yozuv va faqat `genre` maydoni olinadi.
 *  - `_id: { $nin: [...] }` ichida string ID lar bor edi — MongoDB ObjectId
 *    bilan solishtirmagani uchun filtr ishlamasdi (ko'rilgan kinolar qayta chiqardi).
 *  - `averageRating` virtual maydon bo'yicha sort qilinardi — DB da bunday
 *    maydon yo'q, ya'ni sort e'tiborsiz qolardi. Endi haqiqiy maydonlar bo'yicha.
 */

const LIST_FIELDS = 'code title poster genre year views ratingSum ratingCount';

export const getSmartRecommendations = async (telegramIdOrObjectId, limit = 5) => {
    try {
        const query = typeof telegramIdOrObjectId === 'number'
            ? { telegramId: telegramIdOrObjectId }
            : { _id: telegramIdOrObjectId };

        const user = await User.findOne(query)
            .select('watchHistory')
            .slice('watchHistory', -20)
            .populate({ path: 'watchHistory.movie', select: 'genre' })
            .lean();

        const watchedIds = [];
        const genreCounts = new Map();

        for (const entry of user?.watchHistory ?? []) {
            const movie = entry.movie;
            if (!movie) continue;
            watchedIds.push(movie._id);
            for (const genre of String(movie.genre ?? '').split(',')) {
                const key = genre.trim().toLowerCase();
                if (key) genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
            }
        }

        const topGenres = [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre);

        const baseFilter = watchedIds.length > 0 ? { _id: { $nin: watchedIds } } : {};

        let recommendations = [];

        if (topGenres.length > 0) {
            recommendations = await Movie.find({
                ...baseFilter,
                genre: { $in: topGenres.map((genre) => new RegExp(genre, 'i')) },
            })
                .select(LIST_FIELDS)
                .sort({ views: -1, ratingCount: -1 })
                .limit(limit)
                .lean();
        }

        // Yetarli bo'lmasa — umumiy top kinolar bilan to'ldiramiz
        if (recommendations.length < limit) {
            const excludeIds = [...watchedIds, ...recommendations.map((movie) => movie._id)];
            const fallback = await Movie.find(excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {})
                .select(LIST_FIELDS)
                .sort({ views: -1 })
                .limit(limit - recommendations.length)
                .lean();
            recommendations = [...recommendations, ...fallback];
        }

        return recommendations;
    } catch (error) {
        logger.error('getSmartRecommendations:', error);
        return [];
    }
};

/** "Shunga o'xshash kinolar" — bir xil janrdagi eng mashhurlari */
export const getSimilarMovies = async (movie, limit = 6) => {
    if (!movie?.genre) return [];
    try {
        const genres = String(movie.genre)
            .split(',')
            .map((genre) => genre.trim())
            .filter(Boolean)
            .map((genre) => new RegExp(genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

        if (genres.length === 0) return [];

        return await Movie.find({ _id: { $ne: movie._id }, genre: { $in: genres } })
            .select(LIST_FIELDS)
            .sort({ views: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        logger.error('getSimilarMovies:', error);
        return [];
    }
};

export default getSmartRecommendations;
