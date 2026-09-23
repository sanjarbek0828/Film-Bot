import { Markup } from 'telegraf';
import logger from '../../utils/logger.js';
import { setupAdminMovieCommands } from './movies.js';
import { setupAdminUserCommands } from './users.js';
import { setupAdminBroadcastCommands } from './broadcast.js';
import { setupAdminSystemCommands } from './system.js';

export const setupAdminCommands = (bot) => {
    const adminCheck = (ctx) => Boolean(ctx.isAdmin);
    const superAdminCheck = (ctx) => Boolean(ctx.isSuperAdmin);

    // Bosh Admin paneli klaviaturasi
    const buildAdminMainKeyboard = (ctx) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🎬 Kinolar Boshqaruvi', 'admin_menu_movies'),
                Markup.button.callback('👥 Foydalanuvchilar & VIP', 'admin_menu_users'),
            ],
            [
                Markup.button.callback('📢 Marketing & Reklama', 'admin_menu_broadcast'),
                Markup.button.callback('⚙️ Tizim & Statistika', 'admin_menu_system'),
            ],
            [
                Markup.button.callback('❌ Yopish', 'admin_close_panel'),
            ],
        ]);
    };

    const getAdminMainText = (ctx) => {
        const adminType = ctx.isSuperAdmin ? '👑 Bosh Admin' : '👮‍♂️ Admin';
        return `👑 <b>FilmX — Admin Boshqaruv Markazi</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Assalomu alaykum, <b>${ctx.from?.first_name || 'Admin'}</b> (${adminType})!\n\n` +
            `Kerakli bo'limni tanlang:`;
    };

    // /admin buyrug'i
    bot.command('admin', async (ctx) => {
        try {
            if (!adminCheck(ctx)) return;
            await ctx.reply(getAdminMainText(ctx), {
                parse_mode: 'HTML',
                ...buildAdminMainKeyboard(ctx),
            });
        } catch (e) {
            logger.error('Admin entry command error:', e);
        }
    });

    // Asosiy panelga qaytish harakati
    bot.action('admin_main_menu', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            await ctx.editMessageText(getAdminMainText(ctx), {
                parse_mode: 'HTML',
                ...buildAdminMainKeyboard(ctx),
            });
        } catch {
            await ctx.reply(getAdminMainText(ctx), {
                parse_mode: 'HTML',
                ...buildAdminMainKeyboard(ctx),
            });
        }
    });

    // Panelni yopish
    bot.action('admin_close_panel', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.deleteMessage().catch(() => {});
    });

    // Submodullarni ulash
    const helpers = { adminCheck, superAdminCheck };
    setupAdminMovieCommands(bot, helpers);
    setupAdminUserCommands(bot, helpers);
    setupAdminBroadcastCommands(bot, helpers);
    setupAdminSystemCommands(bot, helpers);
};

export default setupAdminCommands;
