import { Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { getGenres, getMoviesByGenre } from '../services/movieService.js';
import { escapeHtml, movieTitle } from '../utils/html.js';
import { menuMatcher } from '../utils/menuUtils.js';

/**
 * Kategoriyalar (janrlar) va inline qidiruv.
 *
 * TUZATILGAN BUGLAR:
 *  - Janr ro'yxati `Movie.distinct('genre')` bilan har safar butun kolleksiyani
 *    skanerlardi va "Jangari, Komediya" kabi qo'shma janrlarni ajratmasdi.
 *    Endi keshlangan aggregatsiya (`getGenres`) va toza, bo'lingan janrlar.
 *  - Janr callback_data ("genre_page_2_Uzun Janr Nomi") 64 baytdan oshib,
 *    Telegram tomonidan rad etilishi mumkin edi. Endi indeks asosida ixcham.
 *  - Sahifalash DB darajasida (avval har sahifada 2 ta so'rov).
 */

// Janr nomlarini indeks orqali saqlaymiz (callback_data qisqa bo'lishi uchun)
let genreCacheList = [];

export const setupCategoryCommands = (bot) => {
    const handleCategory = async (ctx) => {
        try {
            const genres = await getGenres();
            if (genres.length === 0) return ctx.reply('📭 Hozircha kategoriyalar yo\'q.');

            genreCacheList = genres.map((g) => g.name);

            const buttons = [];
            for (let i = 0; i < genres.length; i += 2) {
                const row = [Markup.button.callback(`🎭 ${genres[i].name} (${genres[i].count})`, `genre_${i}_1`)];
                if (genres[i + 1]) {
                    row.push(Markup.button.callback(`🎭 ${genres[i + 1].name} (${genres[i + 1].count})`, `genre_${i + 1}_1`));
                }
                buttons.push(row);
            }

            await ctx.reply('📂 <b>Kategoriyalar ro\'yxati:</b>\n\n<i>Kerakli janrni tanlang:</i>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons),
            });
        } catch (error) {
            logger.error('Category menu:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    };
    bot.hears(menuMatcher('menu_category'), handleCategory);
    bot.command(['genres', 'categories'], handleCategory);

    // genre_{index}_{page}
    bot.action(/^genre_(\d+)_(\d+)$/, async (ctx) => {
        try {
            const genreIndex = parseInt(ctx.match[1], 10);
            const page = parseInt(ctx.match[2], 10);
            let genre = genreCacheList[genreIndex];
            if (!genre) {
                const genres = await getGenres();
                genreCacheList = genres.map((g) => g.name);
                genre = genreCacheList[genreIndex];
            }

            if (!genre) {
                return ctx.answerCbQuery('⚠️ Kategoriyani qayta oching', { show_alert: true });
            }

            const { items, total, totalPages } = await getMoviesByGenre(genre, page, 10);
            if (items.length === 0) return ctx.answerCbQuery('📭 Bu janrda kino yo\'q');

            const skip = (page - 1) * 10;
            let msg = `🎭 <b>${escapeHtml(genre)}</b> ${ctx.t('page_info', { page })} — jami ${total} ta\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            items.forEach((movie, i) => {
                const num = skip + i + 1;
                const year = movie.year ? ` <i>(${movie.year})</i>` : '';
                const rating = movie.ratingCount > 0 ? ` • ⭐️ ${(movie.ratingSum / movie.ratingCount).toFixed(1)}` : '';
                msg += `<b>${num}.</b> 🎬 <b>${escapeHtml(movieTitle(movie))}</b>${year}\n`;
                msg += `   └ 🔢 Kod: <code>${movie.code}</code>${rating}\n\n`;
            });
            msg += ctx.t('search_hint');

            const nav = [];
            if (page > 1) nav.push(Markup.button.callback(ctx.t('page_prev'), `genre_${genreIndex}_${page - 1}`));
            if (totalPages > 1) nav.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
            if (page < totalPages) nav.push(Markup.button.callback(ctx.t('page_next'), `genre_${genreIndex}_${page + 1}`));

            const keyboard = nav.length > 0 ? Markup.inlineKeyboard([nav]) : Markup.inlineKeyboard([]);

            try {
                await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
            } catch {
                await ctx.reply(msg, { parse_mode: 'HTML', ...keyboard });
            }
            ctx.answerCbQuery().catch(() => {});
        } catch (error) {
            logger.error('Genre action:', error);
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });
};

export const setupInlineSearch = (bot) => {
    bot.on('inline_query', async (ctx) => {
        try {
            const query = ctx.inlineQuery?.query?.trim();
            if (!query) return ctx.answerInlineQuery([], { cache_time: 10 });

            const { searchMovies, getMovieByCode } = await import('../services/movieService.js');

            let movies = [];
            if (/^\d+$/.test(query)) {
                const movie = await getMovieByCode(parseInt(query, 10));
                if (movie) movies = [movie];
            } else {
                movies = await searchMovies(query, 20);
            }

            const botUsername = ctx.botInfo?.username;
            const results = movies.slice(0, 20).map((movie) => {
                const title = movieTitle(movie);
                const isUrlPoster = movie.poster && /^https?:\/\//i.test(movie.poster);
                return {
                    type: 'article',
                    id: String(movie._id || movie.code),
                    title,
                    description: `📥 Kod: ${movie.code} | 👁 ${movie.views || 0} | 🎭 ${movie.genre || 'Kino'}`,
                    ...(isUrlPoster ? { thumbnail_url: movie.poster } : {}),
                    input_message_content: {
                        message_text:
                            `🎬 <b>${escapeHtml(title)}</b>\n\n` +
                            `🔢 Kod: <code>${movie.code}</code>\n` +
                            `🎭 Janr: ${escapeHtml(movie.genre || 'Noma\'lum')}\n\n` +
                            `<i>To'liq ko'rish uchun tugmani bosing.</i>`,
                        parse_mode: 'HTML',
                    },
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🎬 Botda ko\'rish', url: `https://t.me/${botUsername}?start=${movie.code}` },
                        ]],
                    },
                };
            });

            await ctx.answerInlineQuery(results, { cache_time: 30, is_personal: false });
        } catch (error) {
            logger.error('Inline search:', error);
            ctx.answerInlineQuery([]).catch(() => {});
        }
    });
};

export default setupCategoryCommands;
