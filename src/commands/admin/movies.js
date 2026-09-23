import { Markup } from 'telegraf';
import logger from '../../utils/logger.js';
import Movie from '../../models/Movie.js';
import { countMovies, deleteMovie, getTopMovies } from '../../services/movieService.js';
import { logAdminAction } from '../../models/AdminLog.js';
import { escapeHtml } from '../../utils/html.js';

export const setupAdminMovieCommands = (bot, { adminCheck }) => {
    // ═══ KINOLAR BO'LIMI MENYUSI ═══
    bot.action('admin_menu_movies', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});

        const totalMovies = await countMovies().catch(() => 0);

        const buttons = [
            [
                Markup.button.callback('➕ Yangi kino qo\'shish', 'admin_add_movie'),
                Markup.button.callback('📚 Ommaviy qo\'shish', 'admin_bulk_add'),
            ],
            [
                Markup.button.callback('✏️ Kino tahrirlash', 'admin_edit_movie'),
                Markup.button.callback('📚 Serial (ommaviy)', 'admin_bulk_edit'),
            ],
            [
                Markup.button.callback('🗑️ Kinoni o\'chirish', 'admin_delete_movie'),
                Markup.button.callback('📋 Kinolar ro\'yxati', 'admin_movies_list'),
            ],
            [
                Markup.button.callback('⭐ Top kinolar', 'admin_top_movies'),
                Markup.button.callback('⬅️ Bosh menyu', 'admin_main_menu'),
            ],
        ];

        const text = `🎬 <b>Kinolar Boshqaruvi</b>\n\n` +
            `📊 Bazadagi jami kinolar soni: <b>${totalMovies}</b> ta\n\n` +
            `👇 Kerakli amalni tanlang:`;

        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch {
            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        }
    });

    // Sahnaga kirishlar
    bot.action('admin_add_movie', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('ADD_MOVIE_SCENE');
    });

    bot.action('admin_bulk_add', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('BULK_ADD_MOVIE_SCENE');
    });

    bot.action('admin_edit_movie', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('EDIT_MOVIE_SCENE');
    });

    bot.action('admin_bulk_edit', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('BULK_EDIT_MOVIE_SCENE');
    });

    // ═══ KINOLARNI O'CHIRISH ═══
    bot.action('admin_delete_movie', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(10).lean();
            if (!movies || movies.length === 0) {
                return ctx.reply('📭 Hozircha kinolar yo\'q.');
            }

            const buttons = movies.map((m) => [
                Markup.button.callback(`🗑️ ${m.title?.slice(0, 25) || 'Kino'} (${m.code})`, `delete_movie_${m.code}`),
            ]);
            buttons.push([Markup.button.callback('⬅️ Orqaga', 'admin_menu_movies')]);

            return ctx.reply(
                `🗑️ <b>Kinoni o'chirish:</b>\n\n` +
                `Ro'yxatdan tanlang yoki tezkor buyruq yuboring:\n<code>/delete 1001</code>`,
                { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
            );
        } catch (e) {
            logger.error('Admin delete movie error:', e);
        }
    });

    bot.action(/^delete_movie_(\d+)$/, async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        const code = parseInt(ctx.match[1], 10);
        await ctx.answerCbQuery().catch(() => {});

        return ctx.editMessageText(
            `⚠️ Rostdan ham <b>${code}</b>-kodli kinoni o'chirmoqchimisiz?`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ Ha, o\'chirilsin', `confirm_del_movie_${code}`),
                        Markup.button.callback('❌ Bekor qilish', 'admin_menu_movies'),
                    ],
                ]),
            }
        );
    });

    bot.action(/^confirm_del_movie_(\d+)$/, async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        const code = parseInt(ctx.match[1], 10);
        try {
            const deleted = await deleteMovie(code);
            if (deleted) {
                logAdminAction(ctx.from.id, 'delete_movie', code, `Deleted movie: ${deleted.title}`);
                await ctx.answerCbQuery('✅ Kino o\'chirildi');
                return ctx.editMessageText(`✅ <b>${deleted.title}</b> (kod: <code>${code}</code>) o'chirildi!`, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Kinolar menyusi', 'admin_menu_movies')]]),
                });
            } else {
                return ctx.editMessageText('❌ Kino topilmadi.', {
                    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_menu_movies')]]),
                });
            }
        } catch (e) {
            logger.error('Confirm delete movie error:', e);
            ctx.answerCbQuery('❌ Xatolik');
        }
    });

    // Tezkor /delete <kod> buyrug'i
    bot.command('delete', async (ctx) => {
        if (!adminCheck(ctx)) return;
        const code = parseInt(ctx.message.text.split(' ')[1], 10);
        if (!code) return ctx.reply('⚠️ Format: /delete 1001');

        const deleted = await deleteMovie(code);
        if (deleted) {
            logAdminAction(ctx.from.id, 'delete_movie', code, `Deleted via command: ${deleted.title}`);
            ctx.reply(`✅ <b>${escapeHtml(deleted.title)}</b> (kod: <code>${code}</code>) o'chirildi!`, { parse_mode: 'HTML' });
        } else {
            ctx.reply('❌ Bunday kodli kino topilmadi.');
        }
    });

    // ═══ KINOLAR RO'YXATI ═══
    bot.action('admin_movies_list', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const movies = await Movie.find().sort({ createdAt: -1 }).limit(15).lean();
            const total = await countMovies().catch(() => 0);

            if (movies.length === 0) return ctx.reply('📭 Hozircha kinolar yo\'q.');

            let msg = `🎬 <b>So'nggi qo'shilgan kinolar (${total} tadan 15 tasi):</b>\n\n`;
            movies.forEach((m, i) => {
                msg += `<b>${i + 1}.</b> <code>${m.code}</code> — <b>${escapeHtml(m.title)}</b> (${m.year || '?'}) • 👁 ${m.views || 0}\n`;
            });

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Kinolar menyusi', 'admin_menu_movies')]
            ]));
        } catch (e) {
            logger.error('Admin movies list error:', e);
        }
    });

    // ═══ TOP KINOLAR ═══
    bot.action('admin_top_movies', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const movies = await getTopMovies(10);
            if (!movies || movies.length === 0) return ctx.reply('📭 Kinolar yo\'q.');

            let msg = '⭐ <b>Eng ko\'p ko\'rilgan TOP-10 kino:</b>\n\n';
            movies.forEach((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                msg += `${medal} <b>${escapeHtml(m.title)}</b> — 👁 ${m.views || 0} marta | Kod: <code>${m.code}</code>\n`;
            });

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Kinolar menyusi', 'admin_menu_movies')]
            ]));
        } catch (e) {
            logger.error('Admin top movies error:', e);
        }
    });
};

export default setupAdminMovieCommands;
