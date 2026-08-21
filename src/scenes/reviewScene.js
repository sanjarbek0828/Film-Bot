import { Scenes, Markup } from 'telegraf';
import Movie from '../models/Movie.js';
import { updateUser } from '../services/userService.js';
import { invalidateMovieCaches } from '../services/movieService.js';
import { escapeHtml, movieTitle } from '../utils/html.js';
import logger from '../utils/logger.js';

/**
 * Sharh (review) qo'shish wizardi.
 *
 * TUZATILGAN BUGLAR:
 *  - `logger` import qilinmagan edi — xato yuz berganda `catch` bloki
 *    "logger is not defined" bilan qayta yiqilardi (crash).
 *  - Yetishmayotgan i18n kalitlar endi locales.js da mavjud.
 *  - Sharh matni HTML-escape qilinadi.
 *  - `totalComments` userService orqali (kesh sinxron).
 */

const reviewScene = new Scenes.WizardScene(
    'REVIEW_SCENE',
    // Step 1: Baho
    async (ctx) => {
        try {
            const movieCode = ctx.scene.state?.movieCode ?? ctx.wizard.state?.movieCode;
            if (!movieCode) return ctx.scene.leave();
            ctx.wizard.state.movieCode = movieCode;

            await ctx.reply(ctx.t('review_rating_prompt'), {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [1, 2, 3].map((n) => Markup.button.callback(`${n} ⭐️`, `rate_${n}`)),
                    [4, 5].map((n) => Markup.button.callback(`${n} ⭐️`, `rate_${n}`)),
                    [Markup.button.callback(ctx.t('cancel'), 'cancel_review')],
                ]),
            });
            return ctx.wizard.next();
        } catch (error) {
            logger.error('review step1:', error);
            return ctx.scene.leave();
        }
    },
    // Step 2: Sharh matnini kutish
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return;
            const data = ctx.callbackQuery.data;

            if (data === 'cancel_review') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText(ctx.t('review_cancel')).catch(() => {});
                return ctx.scene.leave();
            }

            if (data.startsWith('rate_')) {
                ctx.wizard.state.rating = parseInt(data.split('_')[1], 10);
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText(ctx.t('review_your_rating', { rating: ctx.wizard.state.rating }), {
                    parse_mode: 'HTML',
                }).catch(() => {});
                return ctx.wizard.next();
            }
        } catch (error) {
            logger.error('review step2:', error);
            return ctx.scene.leave();
        }
    },
    // Step 3: Saqlash
    async (ctx) => {
        try {
            if (!ctx.message?.text) return ctx.reply(ctx.t('review_text_error'));

            const comment = ctx.message.text.trim().slice(0, 1000);
            const { rating, movieCode } = ctx.wizard.state;

            const movie = await Movie.findOne({ code: movieCode });
            if (!movie) {
                await ctx.reply(ctx.t('not_found'));
                return ctx.scene.leave();
            }

            movie.reviews.push({
                userId: ctx.from.id,
                userName: ctx.from.first_name || 'Foydalanuvchi',
                rating,
                comment,
                date: new Date(),
            });
            movie.ratingSum = (movie.ratingSum || 0) + rating;
            movie.ratingCount = (movie.ratingCount || 0) + 1;
            await movie.save();
            invalidateMovieCaches(movieCode);

            updateUser(ctx.from.id, { $inc: { totalComments: 1 } }).catch(() => {});

            await ctx.reply(ctx.t('review_success', { rating, comment: escapeHtml(comment) }), { parse_mode: 'HTML' });
            return ctx.scene.leave();
        } catch (error) {
            logger.error('review save:', error);
            await ctx.reply(ctx.t('error_general')).catch(() => {});
            return ctx.scene.leave();
        }
    }
);

reviewScene.command('cancel', async (ctx) => {
    await ctx.reply(ctx.t('review_cancel')).catch(() => {});
    return ctx.scene.leave();
});

reviewScene.action('cancel_review', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText(ctx.t('review_cancel')).catch(() => {});
    return ctx.scene.leave();
});

export default reviewScene;
