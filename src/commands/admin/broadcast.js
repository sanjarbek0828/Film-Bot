import { Markup } from 'telegraf';
import logger from '../../utils/logger.js';
import User from '../../models/User.js';
import { broadcast } from '../../utils/broadcaster.js';
import { logAdminAction } from '../../models/AdminLog.js';

export const setupAdminBroadcastCommands = (bot, { adminCheck }) => {
    // ═══ REKLAMA & MARKETING MENYUSI ═══
    bot.action('admin_menu_broadcast', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});

        const usersCount = await User.countDocuments({ isBanned: { $ne: true } }).catch(() => 0);
        const lastBroadcastUsers = await User.countDocuments({ lastBroadcastMsgId: { $ne: null } }).catch(() => 0);

        const buttons = [
            [
                Markup.button.callback('📢 Reklama yuborish', 'admin_broadcast'),
                Markup.button.callback('🗑 Oxirgi reklamani o\'chirish', 'delete_last_broadcast'),
            ],
            [
                Markup.button.callback('📢 Majburiy obuna', 'admin_subscription'),
                Markup.button.callback('🎫 Promokod yaratish', 'admin_promo'),
            ],
            [
                Markup.button.callback('🤖 Avto-post sozlamalari', 'admin_autopost'),
                Markup.button.callback('📩 Shaxsiy xat yuborish', 'admin_direct_message'),
            ],
            [
                Markup.button.callback('⬅️ Bosh menyu', 'admin_main_menu'),
            ],
        ];

        const text = `📢 <b>Marketing & Reklama Boshqaruvi</b>\n\n` +
            `👥 Faol auditoriya: <b>${usersCount}</b> ta foydalanuvchi\n` +
            `🗑 O'chirish mumkin bo'lgan oxirgi xabarlar: <b>${lastBroadcastUsers}</b> ta\n\n` +
            `👇 Kerakli amalni tanlang:`;

        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch {
            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        }
    });

    // Sahnaga kirishlar
    bot.action('admin_broadcast', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('BROADCAST_SCENE');
    });

    bot.action('admin_subscription', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('MANDATORY_SUBSCRIPTION_SCENE');
    });

    bot.action('admin_promo', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('PROMO_WIZARD_SCENE');
    });

    bot.action('admin_autopost', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('AUTO_POST_SETTINGS_SCENE');
    });

    bot.action('admin_direct_message', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('DIRECT_MESSAGE_SCENE');
    });

    // ═══ OXIRGI TARQATMANI O'CHIRISH ═══
    bot.action('delete_last_broadcast', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            const users = await User.find({ lastBroadcastMsgId: { $ne: null } }).lean();
            if (!users || users.length === 0) {
                return ctx.answerCbQuery('📭 O\'chirish mumkin bo\'lgan oxirgi reklama topilmadi.', { show_alert: true });
            }

            await ctx.answerCbQuery('O\'chirish boshlandi...').catch(() => {});

            await ctx.reply(
                `🗑 <b>Massaviy o'chirish boshlandi!</b>\n\n` +
                `Jami <b>${users.length} ta</b> foydalanuvchi chatidan botning oxirgi xabari olib tashlanmoqda...`,
                { parse_mode: 'HTML' }
            );

            const recipients = users.map((u) => ({ telegramId: u.telegramId, msgId: u.lastBroadcastMsgId }));
            const byId = new Map(recipients.map((r) => [r.telegramId, r.msgId]));

            const result = await broadcast({
                recipients: recipients.map((r) => r.telegramId),
                send: (userId) => ctx.telegram.deleteMessage(userId, byId.get(userId)),
            });

            await User.updateMany({ lastBroadcastMsgId: { $ne: null } }, { $set: { lastBroadcastMsgId: null } }).catch(() => {});
            logAdminAction(ctx.from.id, 'delete_broadcast', null, `Deleted messages: ${result.sent} success, ${result.failed + result.blocked} failed`);

            await ctx.reply(
                `✅ <b>O'chirish yakunlandi!</b>\n\n` +
                `🗑 O'chirildi: <b>${result.sent}</b> ta\n` +
                `❌ O'chirib bo'lmadi: <b>${result.failed + result.blocked}</b> ta`,
                { parse_mode: 'HTML' }
            );
        } catch (e) {
            logger.error('Delete broadcast error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => {});
        }
    });
};

export default setupAdminBroadcastCommands;
