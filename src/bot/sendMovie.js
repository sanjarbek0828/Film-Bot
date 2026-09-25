import { Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { escapeHtml, movieTitle, truncate, TELEGRAM_LIMITS } from '../utils/html.js';
import { incrementViews } from '../services/movieService.js';
import { recordMovieWatch } from '../services/userService.js';
import { isVipUser } from '../utils/menuUtils.js';

/**
 * Kino yuborish — botning eng ko'p ishlatiladigan funksiyasi.
 *
 * TUZATILGAN BUGLAR:
 *  1. `escapeHTML` faqat sarlavhaga qo'llanardi, ammo janr/tavsif qo'shilmagan
 *     edi. Endi barcha foydalanuvchi ma'lumotlari escape qilinadi (kino nomida
 *     `<` yoki `&` bo'lsa Telegram butun xabarni rad etardi).
 *  2. `moviesWatched % 5 === 0` — hisoblagich fire-and-forget yangilangani
 *     uchun eski qiymat bilan solishtirilardi, promo tasodifiy chiqardi.
 *  3. Ko'rish TARIXI hech qachon yozilmasdi — "📜 Tarix" bo'limi doim bo'sh
 *     turardi (avval faqat `moviesWatched` oshirilardi).
 *  4. `caption` 1024 belgidan oshsa Telegram xato qaytarardi — endi kesiladi.
 *  5. Video yuborish xato bo'lsa `throw` qilinib, yuqorida "fayl eskirgan"
 *     deb aytilardi, lekin poster/link zaxira varianti sinalmasdi.
 */

/** Kino uchun inline tugmalarni yasaydi (ixcham, zamonaviy 2 qator) */
const buildMovieButtons = (movie, { isVip, botUsername }) => {
    const rows = [];

    // 1-qator: Asosiy amallar (Saqlash va Ulashish)
    const row1 = [];
    if (movie._id) {
        row1.push(Markup.button.callback('❤️ Saqlash', `fav_${movie._id}`));
    }
    if (botUsername && movie.code) {
        row1.push(Markup.button.switchToChat('📤 Ulashish', String(movie.code)));
    }
    if (row1.length > 0) rows.push(row1);

    // 2-qator: Fikrlar va O'xshash filmlar
    const row2 = [];
    if (movie.code) {
        row2.push(Markup.button.callback('💬 Sharhlar', `read_reviews_${movie.code}`));
        row2.push(Markup.button.callback('✨ O\'xshash', `similar_${movie.code}`));
    }
    if (row2.length > 0) rows.push(row2);

    // 3-qator: Faqat to'g'ridan-to'g'ri yuklab olish havolasi mavjud bo'lgandagina chiqadi
    if (movie.link && !movie.isRestricted) {
        if (isVip) {
            rows.push([Markup.button.url('📥 Yuklab olish', movie.link)]);
        } else {
            rows.push([Markup.button.callback('💎 VIP bilan yuklash', 'vip_info')]);
        }
    }

    return Markup.inlineKeyboard(rows);
};

/** Caption matnini yasaydi (HTML-xavfsiz va limitga sig'gan) */
const buildCaption = (movie, { isVip, views }) => {
    const parts = [`🎬 <b>${escapeHtml(movieTitle(movie))}</b>`];

    const meta = [];
    if (movie.year) meta.push(`📅 ${movie.year}`);
    if (movie.genre) meta.push(`🎭 ${escapeHtml(movie.genre)}`);
    if (movie.ratingCount > 0) {
        meta.push(`⭐️ ${(movie.ratingSum / movie.ratingCount).toFixed(1)}`);
    }
    if (meta.length > 0) parts.push(meta.join('  •  '));

    parts.push('');
    parts.push(`🔢 <b>Kod:</b> <code>${movie.code}</code>`);
    parts.push(`👁 <b>Ko'rishlar:</b> ${views.toLocaleString('uz-UZ')}`);

    if (movie.description) {
        const description = escapeHtml(String(movie.description).trim()).slice(0, 320);
        if (description) parts.push(`\n📝 <i>${description}${movie.description.length > 320 ? '…' : ''}</i>`);
    }

    if (!isVip) {
        parts.push('\n🔒 <i>Yuklab olish va uzatish — VIP obunachilar uchun.</i>');
    }

    return truncate(parts.join('\n'), TELEGRAM_LIMITS.CAPTION);
};

/**
 * Kinoni to'g'ridan-to'g'ri berilgan chatga yuboradi (Telegram instance orqali).
 * API va Telegraf kontekstlarida bir xil ishlaydi.
 */
export const sendMovieDirect = async (telegram, chatId, movie, dbUser, { botUsername, isVip: explicitVip, showVipPromo } = {}) => {
    if (!movie || !chatId || !telegram) return false;

    const isVip = explicitVip !== undefined ? explicitVip : isVipUser(dbUser);
    const views = (movie.views || 0) + 1;
    const caption = buildCaption(movie, { isVip, views });
    const keyboard = buildMovieButtons(movie, { isVip, botUsername });

    const options = {
        caption,
        parse_mode: 'HTML',
        protect_content: !isVip,
        ...keyboard,
    };

    let delivered = false;

    // 1) Video
    if (movie.fileId) {
        try {
            await telegram.sendVideo(chatId, movie.fileId, { ...options, supports_streaming: true });
            delivered = true;
        } catch (error) {
            logger.warn(`Video yuborilmadi (kod ${movie.code}):`, error?.response?.description || error.message);
        }
    }

    // 2) Poster (video bo'lmasa yoki xato bo'lsa)
    if (!delivered && movie.poster) {
        try {
            await telegram.sendPhoto(chatId, movie.poster, options);
            delivered = true;
        } catch (error) {
            logger.warn(`Poster yuborilmadi (kod ${movie.code}):`, error?.response?.description || error.message);
        }
    }

    // 3) Faqat matn
    if (!delivered) {
        try {
            await telegram.sendMessage(
                chatId,
                `${caption}\n\n⚠️ <i>Ushbu kinoning media fayli mavjud emas. Admin tez orada tuzatadi.</i>`,
                { parse_mode: 'HTML', ...keyboard }
            );
            delivered = true;
        } catch (error) {
            logger.error('sendMovieDirect fallback:', error);
            return false;
        }
    }

    // Statistikani yangilaymiz (natijani kutmasdan)
    incrementViews(movie._id);
    if (dbUser?.telegramId) {
        recordMovieWatch(dbUser.telegramId, movie._id);

        const watched = (dbUser.moviesWatched || 0) + 1;
        if (!isVip && watched > 0 && watched % 4 === 0 && typeof showVipPromo === 'function') {
            setTimeout(() => showVipPromo(), 2500);
        }
    }

    return true;
};

/**
 * Kinoni foydalanuvchiga yuboradi (Telegraf kontekstida).
 * @returns {Promise<boolean>} muvaffaqiyatli yuborilganini bildiradi
 */
export const sendMovie = async (ctx, movie, dbUser) => {
    if (!movie) {
        await ctx.reply(ctx.t?.('not_found') || '📭 Kino topilmadi.').catch(() => {});
        return false;
    }

    const isVip = ctx.isVip ? ctx.isVip() : isVipUser(dbUser);
    return sendMovieDirect(ctx.telegram, ctx.chat.id, movie, dbUser, {
        botUsername: ctx.botInfo?.username,
        isVip,
        showVipPromo: () => ctx.showVipPromo?.(),
    });
};

export default sendMovie;

