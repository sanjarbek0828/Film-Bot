import { Markup } from 'telegraf';
import logger from '../utils/logger.js';
import {
    getMovieByCode,
    searchMovies,
    getNewMovies,
    getTopMovies,
    getRandomMovie,
} from '../services/movieService.js';
import { getSmartRecommendations } from '../services/recommendationService.js';
import Favorite from '../models/Favorite.js';
import { extendVip, getWatchHistory, updateUser } from '../services/userService.js';
import { sendMovie } from '../bot/sendMovie.js';
import { sendMainMenu, isVipUser, vipDaysLeft, menuMatcher, isReservedText } from '../utils/menuUtils.js';
import { escapeHtml, movieTitle } from '../utils/html.js';
import config from '../config/env.js';

// Eski importlar (start.js) uchun qayta eksport
export { sendMovie };

const PAGE_SIZE = 10;

/** Kino ro'yxatini zamonaviy va qulay formatda chiqaradi */
const renderMovieList = (title, movies, { startIndex = 0 } = {}) => {
    let msg = title ? `${title}\n\n` : '';
    movies.forEach((movie, i) => {
        const num = startIndex + i + 1;
        const year = movie.year ? ` <i>(${movie.year})</i>` : '';
        const rating = movie.ratingCount > 0 ? ` • ⭐️ ${(movie.ratingSum / movie.ratingCount).toFixed(1)}` : '';
        const genre = movie.genre ? ` • 🎭 ${escapeHtml(movie.genre)}` : '';
        msg += `<b>${num}.</b> 🎬 <b>${escapeHtml(movieTitle(movie))}</b>${year}\n`;
        msg += `   └ 🔢 Kod: <code>${movie.code}</code>${rating}${genre}\n\n`;
    });
    return msg;
};

export const setupUserCommands = (bot) => {
    // ═══ KINO QIDIRISH tugmasi ═══
    bot.hears(menuMatcher('menu_search'), (ctx) =>
        ctx.reply(ctx.t('search_prompt'), { parse_mode: 'HTML' }).catch(() => {})
    );

    // ═══ YANGI KINOLAR ═══
    bot.hears(menuMatcher('menu_new'), async (ctx) => {
        try {
            const movies = await getNewMovies(10);
            if (movies.length === 0) return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            const msg = renderMovieList(`🆕 <b>${ctx.t('menu_new')}</b> (So'nggi premyeralar)`, movies) + ctx.t('search_hint');
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('New movies:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    });

    // ═══ TOP KINOLAR ═══
    bot.hears(menuMatcher('menu_top'), async (ctx) => {
        try {
            const movies = await getTopMovies(10);
            if (movies.length === 0) return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            let msg = `🔥 <b>${ctx.t('menu_top')}</b> (Eng ko'p ko'rilgan filmlar)\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            movies.forEach((movie, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<b>${i + 1}.</b>`;
                const year = movie.year ? ` <i>(${movie.year})</i>` : '';
                msg += `${medal} 🎬 <b>${escapeHtml(movieTitle(movie))}</b>${year}\n`;
                msg += `   └ 👁 ${movie.views || 0} marta ko'rildi | 🔢 Kod: <code>${movie.code}</code>\n\n`;
            });
            await ctx.replyWithHTML(msg + ctx.t('search_hint'));
        } catch (error) {
            logger.error('Top movies:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    });

    // ═══ TASODIFIY KINO ═══
    bot.hears(menuMatcher('menu_random'), async (ctx) => {
        try {
            const movie = await getRandomMovie();
            if (!movie) return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            await sendMovie(ctx, movie, ctx.session?.user);
        } catch (error) {
            logger.error('Random movie:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    });

    // ═══ TAVSIYA (AI) ═══
    bot.hears(menuMatcher('menu_recommend'), async (ctx) => {
        try {
            const user = ctx.session?.user;
            if (!user?._id) return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            const movies = await getSmartRecommendations(user.telegramId, 6);
            if (movies.length === 0) return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            const msg = renderMovieList('✨ <b>Siz uchun tavsiyalar:</b>', movies) + ctx.t('search_hint');
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('Recommend:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    });

    // ═══ SHAXSIY KABINET ═══
    bot.hears(menuMatcher('menu_cabinet'), async (ctx) => {
        try {
            const user = ctx.session?.user;
            if (!user) return;
            const vip = isVipUser(user);
            const favCount = user._id ? await Favorite.countDocuments({ user: user._id }).catch(() => 0) : 0;

            let msg = `👤 <b>${ctx.t('menu_cabinet')}</b>\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n`;
            msg += `👤 <b>Ism:</b> ${escapeHtml(ctx.from.first_name || 'Foydalanuvchi')}\n`;
            msg += `🎬 <b>Ko'rilgan filmlar:</b> <code>${user.moviesWatched || 0}</code> ta\n`;
            msg += `❤️ <b>Sevimlilar:</b> <code>${favCount}</code> ta\n`;
            msg += `🎁 <b>Jamg'arilgan ballar:</b> <code>${user.points || 0}</code> ball\n`;
            msg += `👥 <b>Taklif etilgan do'stlar:</b> <code>${user.referralCount || 0}</code> ta\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            msg += vip
                ? `💎 <b>Maqom:</b> VIP (⭐️ ${vipDaysLeft(user)} kun qoldi)`
                : `👤 <b>Maqom:</b> Oddiy foydalanuvchi`;

            const buttons = [
                [Markup.button.callback('❤️ Sevimlilar', 'cb_fav'), Markup.button.callback('📜 Tarix', 'cb_history')],
                [Markup.button.callback('🎁 Kunlik bonus (+25)', 'cb_bonus'), Markup.button.callback('🗣 Do\'st taklif qilish', 'cb_invite')],
                [vip ? Markup.button.callback('👑 VIP holati', 'cb_vip') : Markup.button.callback('💎 VIP sotib olish', 'vip_info')],
            ];

            await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch (error) {
            logger.error('Cabinet:', error);
            ctx.reply(ctx.t('error_general')).catch(() => {});
        }
    });

    // ═══ SEVIMLILAR ═══
    bot.action('cb_fav', async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const user = ctx.session?.user;
            if (!user?._id) return;
            const favorites = await Favorite.find({ user: user._id }).populate('movie').lean();
            const valid = favorites.filter((f) => f.movie);
            if (valid.length === 0) return ctx.reply('📭 <b>Sevimlilar ro\'yxatingiz bo\'sh.</b>\n\nKinolarni saqlash uchun film kartasidagi «❤️ Saqlash» tugmasini bosing.', { parse_mode: 'HTML' });
            const msg = renderMovieList('❤️ <b>Sevimli kinolaringiz:</b>', valid.map((f) => f.movie)) + ctx.t('search_hint');
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('cb_fav:', error);
        }
    });

    // ═══ KO'RISH TARIXI (VIP) ═══
    bot.action('cb_history', async (ctx) => {
        try {
            if (!ctx.isVip()) return ctx.answerCbQuery(ctx.t('vip_restricted'), { show_alert: true });
            await ctx.answerCbQuery().catch(() => {});
            const history = await getWatchHistory(ctx.from.id, 20);
            if (history.length === 0) return ctx.reply('📭 <b>Ko\'rishlar tarixi bo\'sh.</b>\n\nSiz hali birorta ham kino ko\'rmadingiz.', { parse_mode: 'HTML' });
            const msg = renderMovieList('📜 <b>Ko\'rishlar tarixi:</b>', history.map((h) => h.movie)) + ctx.t('search_hint');
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('cb_history:', error);
        }
    });

    // ═══ KUNLIK BONUS ═══
    bot.action('cb_bonus', async (ctx) => {
        try {
            const user = ctx.session?.user;
            if (!user?.telegramId) return ctx.answerCbQuery('❌', { show_alert: true });

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            if (user.lastDailyBonus && new Date(user.lastDailyBonus) >= startOfDay) {
                return ctx.answerCbQuery('⏳ Bugungi bonusni olib bo\'lgansiz! Ertaga keling.', { show_alert: true });
            }

            const updated = await updateUser(user.telegramId, {
                $inc: { points: 25 },
                $set: { lastDailyBonus: new Date() },
            });
            if (ctx.session?.user && updated) ctx.session.user.points = updated.points;

            await ctx.answerCbQuery(`🎁 +25 ball! Jami: ${updated?.points ?? '?'}`, { show_alert: true });
        } catch (error) {
            logger.error('cb_bonus:', error);
        }
    });

    // ═══ DO'ST TAKLIF QILISH ═══
    bot.action('cb_invite', async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
            await ctx.replyWithHTML(ctx.t('referral_promo', { link }), { disable_web_page_preview: true });
        } catch (error) {
            logger.error('cb_invite:', error);
        }
    });

    // ═══ VIP HOLATI ═══
    bot.action('cb_vip', async (ctx) => {
        try {
            const user = ctx.session?.user;
            if (isVipUser(user)) {
                const diff = new Date(user.vipUntil) - Date.now();
                const days = Math.floor(diff / 86_400_000);
                const hours = Math.floor((diff % 86_400_000) / 3_600_000);
                return ctx.answerCbQuery(`💎 VIP: ${days} kun, ${hours} soat qoldi`, { show_alert: true });
            }
            return ctx.answerCbQuery('VIP muddati tugagan', { show_alert: true });
        } catch (error) {
            logger.error('cb_vip:', error);
        }
    });

    // ═══════════════════ VIP DO'KONI (Telegram Stars) ═══════════════════
    bot.action(['vip_info', 'cb_shop'], async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const plans = Object.values(config.vipPlans);
            const buttons = plans.map((plan) => [
                Markup.button.callback(`⭐️ ${plan.title} — ${plan.stars} Stars`, `buy_stars_${plan.days}`),
            ]);
            buttons.push([Markup.button.callback('❌ Yopish', 'cancel_pay')]);

            await ctx.reply(
                `💎 <b>VIP obuna imtiyozlari</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `✨ VIP maqomi bilan siz quyidagi barcha imkoniyatlarga ega bo'lasiz:\n` +
                `├ 🎬 Kinolarni to'g'ridan-to'g'ri <b>yuklab olish</b>\n` +
                `├ ⚡️ <b>Eng yuqori tezlik</b> va himoyalangan ulanish\n` +
                `├ 💬 Filmlarga <b>sharh va baholar</b> qoldirish\n` +
                `├ ❤️ <b>Sevimlilar</b> va to'liq ko'rishlar tarixi\n` +
                `└ 🚫 <b>Majburiy kanallarsiz</b> qulay tomosha\n\n` +
                `⭐️ <i>Telegram Stars orqali tezkor va xavfsiz to'lov qiling:</i>`,
                { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
            );
        } catch (error) {
            logger.error('vip_info:', error);
        }
    });

    bot.action(/^buy_stars_(\d+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery().catch(() => {});
            const days = parseInt(ctx.match[1], 10);
            const plan = config.vipPlans[days];
            if (!plan) return;

            await ctx.replyWithInvoice({
                title: plan.title,
                description: `FilmXBot uchun ${plan.title} obunasi — cheklovsiz kinolar.`,
                payload: `vip_stars_${days}_${ctx.from.id}`,
                provider_token: '', // Stars uchun bo'sh bo'lishi shart
                currency: 'XTR',
                prices: [{ label: plan.title, amount: plan.stars }],
            });
        } catch (error) {
            logger.error('buy_stars invoice:', error);
        }
    });

    bot.action('cancel_pay', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.deleteMessage().catch(() => {});
    });

    bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true).catch(() => {}));

    bot.on('successful_payment', async (ctx) => {
        try {
            const payment = ctx.message.successful_payment;
            const [, , daysStr, targetStr] = payment.invoice_payload.split('_');
            const days = parseInt(daysStr, 10);
            const targetId = parseInt(targetStr, 10);

            if (!days || ctx.from.id !== targetId) return;

            const updated = await extendVip(targetId, days, 'stars_payment');
            if (updated) {
                if (ctx.session) ctx.session.user = updated;
                await ctx.reply(
                    `🎉 <b>To'lov muvaffaqiyatli qabul qilindi!</b>\n\n` +
                    `💎 VIP obuna <b>${new Date(updated.vipUntil).toLocaleDateString('uz-UZ')}</b> gacha faollashtirildi.\n\n` +
                    `🍿 Barcha filmlardan va premium imtiyozlardan bahramand bo'ling!`,
                    { parse_mode: 'HTML' }
                );
                setTimeout(() => sendMainMenu(ctx), 600);
            }
        } catch (error) {
            logger.error('successful_payment:', error);
        }
    });

    // ═══════════════════ SEVIMLILARGA QO'SHISH/OLIB TASHLASH ═══════════════════
    bot.action(/^fav_(.+)$/, async (ctx) => {
        try {
            const movieId = ctx.match[1];
            const user = ctx.session?.user;
            if (!user?._id) return ctx.answerCbQuery('❌');

            const existing = await Favorite.findOne({ user: user._id, movie: movieId });
            if (existing) {
                await Favorite.deleteOne({ _id: existing._id });
                return ctx.answerCbQuery('💔 Sevimlilardan olib tashlandi');
            }
            await Favorite.create({ user: user._id, movie: movieId });
            return ctx.answerCbQuery('❤️ Sevimlilarga qo\'shildi');
        } catch (error) {
            // Duplicate (parallel bosish) — muammo emas
            if (error.code === 11000) return ctx.answerCbQuery('❤️').catch(() => {});
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });

    // ═══ SHUNGA O'XSHASH ═══
    bot.action(/^similar_(\d+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery('✨ Qidirilmoqda...').catch(() => {});
            const movie = await getMovieByCode(parseInt(ctx.match[1], 10));
            if (!movie) return;
            const { getSimilarMovies } = await import('../services/recommendationService.js');
            const similar = await getSimilarMovies(movie, 8);
            if (similar.length === 0) return ctx.reply('📭 O\'xshash kino topilmadi.');
            const msg = renderMovieList(`✨ <b>"${escapeHtml(movieTitle(movie))}" ga o'xshash:</b>`, similar) + ctx.t('search_hint');
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('similar:', error);
        }
    });

    // ═══ SHARH QOLDIRISH (VIP) ═══
    bot.action(/^review_(\d+)$/, async (ctx) => {
        try {
            if (!ctx.isVip()) return ctx.answerCbQuery(ctx.t('vip_only_comment'), { show_alert: true });
            await ctx.answerCbQuery().catch(() => {});
            return ctx.scene.enter('REVIEW_SCENE', { movieCode: parseInt(ctx.match[1], 10) });
        } catch (error) {
            logger.error('review enter:', error);
        }
    });

    // ═══ SHARHLARNI O'QISH (VIP) ═══
    bot.action(/^read_reviews_(\d+)$/, async (ctx) => {
        try {
            if (!ctx.isVip()) return ctx.answerCbQuery(ctx.t('vip_restricted_review'), { show_alert: true });
            const movie = await getMovieByCode(parseInt(ctx.match[1], 10));
            if (!movie?.reviews?.length) return ctx.answerCbQuery('📭 Hali sharhlar yo\'q', { show_alert: true });

            await ctx.answerCbQuery().catch(() => {});
            const reviews = movie.reviews.slice(-5).reverse();
            let msg = `💬 <b>"${escapeHtml(movieTitle(movie))}" sharhlari:</b>\n\n`;
            reviews.forEach((r) => {
                msg += `${'⭐️'.repeat(r.rating || 0)} <b>${escapeHtml(r.userName || 'Foydalanuvchi')}</b>\n`;
                msg += `<i>${escapeHtml(r.comment || '')}</i>\n\n`;
            });
            await ctx.replyWithHTML(msg);
        } catch (error) {
            logger.error('read_reviews:', error);
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });

    // ═══ SHIKOYAT (VIP) ═══
    bot.action(/^report_(\d+)$/, async (ctx) => {
        try {
            if (!ctx.isVip()) return ctx.answerCbQuery(ctx.t('vip_restricted_report'), { show_alert: true });
            await ctx.answerCbQuery('📝 Shikoyatingizni yozing...').catch(() => {});
            return ctx.scene.enter('REPORT_SCENE', { movieCode: ctx.match[1] });
        } catch (error) {
            logger.error('report enter:', error);
        }
    });

    // ═══ ULASHISH ═══
    bot.action(/^share_(.+)$/, async (ctx) => {
        try {
            const shareUrl = `https://t.me/${ctx.botInfo?.username}?start=${ctx.match[1]}`;
            await ctx.answerCbQuery().catch(() => {});
            await ctx.reply(`📤 <b>Ushbu havolani ulashing:</b>\n\n<code>${shareUrl}</code>`, { parse_mode: 'HTML' });
        } catch (error) {
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });

    bot.action('noop', (ctx) => ctx.answerCbQuery().catch(() => {}));

    // ═══ PROMOKOD ISHLATISH (/promo) ═══
    bot.command('promo', (ctx) => ctx.scene.enter('REDEEM_PROMO_SCENE'));
    bot.action('redeem_promo', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('REDEEM_PROMO_SCENE');
    });

    // ═══ KINO SO'RASH (/request) ═══
    bot.command('request', (ctx) => ctx.scene.enter('REQUEST_SCENE'));
    bot.hears(menuMatcher('menu_vote'), (ctx) => ctx.scene.enter('REQUEST_SCENE'));

    // ═══ KARTA ORQALI TO'LOV ═══
    bot.action('pay_card', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('PAYMENT_RECEIPT_SCENE');
    });

    // ═══ WEB APP DAN KELGAN MA'LUMOT ═══
    bot.on('web_app_data', async (ctx) => {
        try {
            const data = JSON.parse(ctx.message.web_app_data.data);
            if (data.action === 'play_movie' && data.code) {
                const movie = await getMovieByCode(parseInt(data.code, 10));
                if (movie) await sendMovie(ctx, movie, ctx.session?.user);
                else ctx.reply(ctx.t('not_found')).catch(() => {});
            }
        } catch (error) {
            logger.error('web_app_data:', error);
        }
    });

    // ═══════════════════ MATN HANDLERI (kod yoki qidiruv) ═══════════════════
    // MUHIM: bu handler oxirgi bo'lishi kerak (barcha `hears` lardan keyin).
    bot.on('text', async (ctx, next) => {
        try {
            if (ctx.session?.__scenes?.current) return next();

            const text = ctx.message?.text?.trim();
            if (!text || text.startsWith('/') || isReservedText(text)) return next();

            // Foydalanuvchi so'rovini o'chiramiz (toza chat uchun) — ixtiyoriy
            ctx.deleteMessage().catch(() => {});

            // Raqam bo'lsa — kod bo'yicha
            if (/^\d{1,7}$/.test(text)) {
                const movie = await getMovieByCode(parseInt(text, 10));
                if (movie) return sendMovie(ctx, movie, ctx.session?.user);
                return ctx.reply(ctx.t('not_found')).catch(() => {});
            }

            // Aks holda — nom bo'yicha qidiruv
            const movies = await searchMovies(text);
            if (movies.length === 0) {
                return ctx.reply(ctx.t('not_found'), { parse_mode: 'HTML' });
            }

            const totalPages = Math.ceil(movies.length / PAGE_SIZE);
            let msg = ctx.t('search_results', { query: escapeHtml(text), count: movies.length }) + '\n\n';
            msg += renderMovieList('', movies.slice(0, PAGE_SIZE)).trim();
            msg += ctx.t('search_hint');

            const buttons = [];
            if (totalPages > 1) {
                buttons.push([
                    Markup.button.callback(`1/${totalPages}`, 'noop'),
                    Markup.button.callback(ctx.t('page_next'), `search_2_${encodeURIComponent(text.slice(0, 30))}`),
                ]);
            }
            await ctx.replyWithHTML(msg, Markup.inlineKeyboard(buttons));
        } catch (error) {
            logger.error('Text handler:', error);
        }
    });

    // ═══ QIDIRUV SAHIFALASH ═══
    bot.action(/^search_(\d+)_(.+)$/, async (ctx) => {
        try {
            const page = parseInt(ctx.match[1], 10);
            const query = decodeURIComponent(ctx.match[2]);
            const movies = await searchMovies(query);
            if (movies.length === 0) return ctx.answerCbQuery(ctx.t('not_found'), { show_alert: true });

            const totalPages = Math.ceil(movies.length / PAGE_SIZE);
            if (page < 1 || page > totalPages) return ctx.answerCbQuery('❌', { show_alert: true });

            const skip = (page - 1) * PAGE_SIZE;
            const pageMovies = movies.slice(skip, skip + PAGE_SIZE);

            let msg = ctx.t('search_results', { query: escapeHtml(query), count: movies.length }) + '\n\n';
            msg += renderMovieList('', pageMovies, { startIndex: skip }).trim();
            msg += ctx.t('search_hint');

            const nav = [];
            const safeQuery = encodeURIComponent(query.slice(0, 30));
            if (page > 1) nav.push(Markup.button.callback(ctx.t('page_prev'), `search_${page - 1}_${safeQuery}`));
            nav.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
            if (page < totalPages) nav.push(Markup.button.callback(ctx.t('page_next'), `search_${page + 1}_${safeQuery}`));

            await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard([nav]) });
            ctx.answerCbQuery().catch(() => {});
        } catch (error) {
            ctx.answerCbQuery('❌').catch(() => {});
        }
    });
};

export default setupUserCommands;
