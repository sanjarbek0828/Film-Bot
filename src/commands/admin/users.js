import { Markup } from 'telegraf';
import logger from '../../utils/logger.js';
import User from '../../models/User.js';
import { isAdmin } from '../../utils/adminHelper.js';
import { extendVip, removeVip, setBanned, invalidateUserCache } from '../../services/userService.js';
import { resetUserCaches } from '../../bot/middleware.js';
import { logAdminAction } from '../../models/AdminLog.js';
import { escapeHtml } from '../../utils/html.js';
import config from '../../config/env.js';

export const setupAdminUserCommands = (bot, { adminCheck, superAdminCheck }) => {
    // ═══ FOYDALANUVCHILAR & VIP MENYUSI ═══
    bot.action('admin_menu_users', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});

        const totalUsers = await User.countDocuments().catch(() => 0);
        const vipCount = await User.countDocuments({ vipUntil: { $gt: new Date() } }).catch(() => 0);
        const bannedCount = await User.countDocuments({ isBanned: true }).catch(() => 0);

        const buttons = [
            [
                Markup.button.callback('💎 VIP Berish', 'admin_vip'),
                Markup.button.callback('🗑 VIP Bekor qilish', 'admin_vip_remove_ui'),
            ],
            [
                Markup.button.callback('🌐 Barchaga VIP (Aksiya)', 'admin_global_vip'),
                Markup.button.callback('👤 Foydalanuvchi profili', 'admin_user_profile'),
            ],
            [
                Markup.button.callback('🚫 Ban / Unban', 'admin_ban_unban'),
                Markup.button.callback('👥 Foydalanuvchilar', 'admin_users_list'),
            ],
            [
                Markup.button.callback('⬅️ Bosh menyu', 'admin_main_menu'),
            ],
        ];

        const text = `👥 <b>Foydalanuvchilar & VIP Boshqaruvi</b>\n\n` +
            `📊 <b>Statistika:</b>\n` +
            `├ Jami a'zolar: <b>${totalUsers}</b> ta\n` +
            `├ Faol VIP a'zolar: <b>${vipCount}</b> ta\n` +
            `└ Bloklanganlar: <b>${bannedCount}</b> ta\n\n` +
            `👇 Kerakli amalni tanlang:`;

        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch {
            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        }
    });

    // Sahnaga kirishlar
    bot.action('admin_vip', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('VIP_SCENE');
    });

    bot.action('admin_global_vip', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('GLOBAL_VIP_SCENE');
    });

    bot.action('admin_user_profile', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('USER_PROFILE_SCENE');
    });

    // ═══ FOYDALANUVCHILAR RO'YXATI ═══
    bot.action('admin_users_list', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const users = await User.find().sort({ createdAt: -1 }).limit(20).lean();
            const total = await User.countDocuments().catch(() => 0);

            let msg = `👥 <b>So'nggi foydalanuvchilar (${total} tadan 20 tasi):</b>\n\n`;
            users.forEach((u) => {
                const status = u.isBanned ? '🚫' : (u.vipUntil && new Date(u.vipUntil) > new Date() ? '💎' : '👤');
                const name = escapeHtml(u.firstName || u.username || 'Foydalanuvchi');
                msg += `${status} ${name} — ID: <code>${u.telegramId}</code>\n`;
            });

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Foydalanuvchilar menyusi', 'admin_menu_users')]
            ]));
        } catch (e) {
            logger.error('Admin users list error:', e);
        }
    });

    // ═══ VIP NI BEKOR QILISH (UI) ═══
    bot.action('admin_vip_remove_ui', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const users = await User.find({ vipUntil: { $gt: new Date() } }).limit(10).lean();
            if (!users || users.length === 0) {
                return ctx.reply('📭 Hozircha faol VIP foydalanuvchilar yo\'q.');
            }

            const buttons = users.map((u) => [
                Markup.button.callback(`❌ ${u.firstName || u.username || 'User'} (${u.telegramId})`, `remove_vip_${u.telegramId}`),
            ]);
            buttons.push([Markup.button.callback('⬅️ Orqaga', 'admin_menu_users')]);

            return ctx.reply('🗑 <b>VIP maqomini bekor qilish uchun foydalanuvchini tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons),
            });
        } catch (e) {
            logger.error('Admin vip remove ui error:', e);
        }
    });

    bot.action(/^remove_vip_(\d+)$/, async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        const targetId = parseInt(ctx.match[1], 10);
        try {
            const updated = await removeVip(targetId);
            resetUserCaches(targetId);
            if (updated) {
                logAdminAction(ctx.from.id, 'remove_vip', targetId, 'Removed VIP via UI');
                await ctx.answerCbQuery('✅ VIP bekor qilindi');
                await ctx.editMessageText(`✅ <code>${targetId}</code> ning VIP maqomi bekor qilindi.`, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_menu_users')]]),
                });
            } else {
                ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
            }
        } catch (e) {
            logger.error('Remove VIP error:', e);
            ctx.answerCbQuery('❌ Xatolik');
        }
    });

    // ═══ BAN / UNBAN BOSHQARUVI ═══
    bot.action('admin_ban_unban', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const recentUsers = await User.find({ telegramId: { $nin: config.adminIds } })
                .sort({ _id: -1 })
                .limit(10)
                .lean();

            if (!recentUsers || recentUsers.length === 0) {
                return ctx.reply('📭 Foydalanuvchilar topilmadi.');
            }

            const buttons = recentUsers.map((u) => {
                const label = `${u.isBanned ? '✅ Unban' : '🚫 Ban'} ${u.firstName || u.username || 'User'} (${u.telegramId})`;
                const action = u.isBanned ? `unban_user_${u.telegramId}` : `ban_user_${u.telegramId}`;
                return [Markup.button.callback(label, action)];
            });
            buttons.push([Markup.button.callback('⬅️ Orqaga', 'admin_menu_users')]);

            return ctx.reply(
                `🚫 <b>Foydalanuvchini bloklash / blokdan chiqarish:</b>\n\n` +
                `Tezkor buyruqlar:\n• <code>/ban ID Sabab</code>\n• <code>/unban ID</code>`,
                { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
            );
        } catch (e) {
            logger.error('Admin ban/unban error:', e);
        }
    });

    bot.action(/^ban_user_(\d+)$/, async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        const targetId = parseInt(ctx.match[1], 10);

        if (isAdmin(targetId)) {
            return ctx.answerCbQuery('❌ Adminni bloklab bo\'lmaydi!', { show_alert: true });
        }

        try {
            const user = await setBanned(targetId, true, { reason: 'Admin UI orqali' });
            resetUserCaches(targetId);

            if (user) {
                logAdminAction(ctx.from.id, 'ban_user_ui', targetId, 'Banned via UI');
                await ctx.answerCbQuery(`🚫 Bloklandi!`);
                await ctx.editMessageText(`🚫 <b>Bloklandi:</b> ${escapeHtml(user.firstName || String(targetId))} (ID: <code>${targetId}</code>)`, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_ban_unban')]]),
                });
            } else {
                ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
            }
        } catch (e) {
            logger.error('Ban action error:', e);
            ctx.answerCbQuery('❌ Xatolik');
        }
    });

    bot.action(/^unban_user_(\d+)$/, async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        const targetId = parseInt(ctx.match[1], 10);

        try {
            const user = await setBanned(targetId, false);
            resetUserCaches(targetId);

            if (user) {
                logAdminAction(ctx.from.id, 'unban_user_ui', targetId, 'Unbanned via UI');
                await ctx.answerCbQuery('✅ Blokdan chiqarildi');
                await ctx.editMessageText(`✅ <b>Blok olib tashlandi:</b> <code>${targetId}</code>`, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_ban_unban')]]),
                });
            } else {
                ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
            }
        } catch (e) {
            logger.error('Unban action error:', e);
            ctx.answerCbQuery('❌ Xatolik');
        }
    });

    // ═══ MATNLI BUYRUQLAR (POWER USERS) ═══
    bot.command('ban', async (ctx) => {
        if (!adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.trim().split(/\s+/);
            const telegramId = parseInt(parts[1], 10);
            const reason = parts.slice(2).join(' ') || 'Qoidabuzarlik';

            if (!telegramId) return ctx.reply('⚠️ Format: /ban 123456789 Sabab');
            if (isAdmin(telegramId)) return ctx.reply('❌ Adminni bloklab bo\'lmaydi!');

            const user = await setBanned(telegramId, true, { reason });
            resetUserCaches(telegramId);

            if (user) {
                logAdminAction(ctx.from.id, 'ban_user', telegramId, `Banned: ${reason}`);
                ctx.reply(`🚫 <b>Bloklandi:</b> ${escapeHtml(user.firstName || String(telegramId))}\nSabab: ${escapeHtml(reason)}`, { parse_mode: 'HTML' });
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Ban command error:', e);
        }
    });

    bot.command('unban', async (ctx) => {
        if (!adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.trim().split(/\s+/);
            const telegramId = parseInt(parts[1], 10);
            if (!telegramId) return ctx.reply('⚠️ Format: /unban 123456789');

            const user = await setBanned(telegramId, false);
            resetUserCaches(telegramId);

            if (user) {
                logAdminAction(ctx.from.id, 'unban_user', telegramId, 'Unbanned via command');
                ctx.reply(`✅ <b>Blok olib tashlandi:</b> ${escapeHtml(user.firstName || String(telegramId))}`, { parse_mode: 'HTML' });
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Unban command error:', e);
        }
    });

    bot.command('unbanall', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.reply('❌ Faqat Bosh Admin uchun!');
        try {
            const res = await User.updateMany({ isBanned: true }, { isBanned: false, bannedUntil: null, banReason: null });
            invalidateUserCache();
            logAdminAction(ctx.from.id, 'unban_all', null, `Unbanned ${res.modifiedCount} users`);
            ctx.reply(`✅ <b>Barcha foydalanuvchilar blokdan chiqarildi!</b>\n\nJami: <b>${res.modifiedCount}</b> ta foydalanuvchi.`, { parse_mode: 'HTML' });
        } catch (e) {
            logger.error('Unbanall command error:', e);
        }
    });

    bot.command('addvip', async (ctx) => {
        if (!adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.trim().split(/\s+/);
            const telegramId = parseInt(parts[1], 10);
            const days = parseInt(parts[2], 10);

            if (!telegramId || !days) return ctx.reply('⚠️ Format: /addvip 123456789 30');

            const user = await extendVip(telegramId, days, ctx.from.id);
            resetUserCaches(telegramId);

            if (user) {
                logAdminAction(ctx.from.id, 'add_vip', telegramId, `Added VIP for ${days} days`);
                const formattedDate = new Date(user.vipUntil).toISOString().split('T')[0];
                ctx.reply(`💎 <b>VIP berildi!</b>\n\n👤 User: <code>${telegramId}</code>\n📅 Tugash muddati: <b>${formattedDate}</b>`, { parse_mode: 'HTML' });
                ctx.telegram.sendMessage(telegramId, `🎉 <b>Tabriklaymiz!</b>\n\nSizga ${days} kunga VIP status berildi!\n📅 Tugash muddati: ${formattedDate}`, { parse_mode: 'HTML' }).catch(() => {});
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi. Avval botga /start bosgan bo\'lishi kerak.');
            }
        } catch (e) {
            logger.error('Addvip command error:', e);
        }
    });

    bot.command('removevip', async (ctx) => {
        if (!adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.trim().split(/\s+/);
            const telegramId = parseInt(parts[1], 10);
            if (!telegramId) return ctx.reply('⚠️ Format: /removevip 123456789');

            const user = await removeVip(telegramId);
            resetUserCaches(telegramId);

            if (user) {
                logAdminAction(ctx.from.id, 'remove_vip', telegramId, 'VIP removed');
                ctx.reply(`✅ <code>${telegramId}</code> foydalanuvchisidan VIP maqomi olib tashlandi.`);
            } else {
                ctx.reply('❌ Foydalanuvchi topilmadi.');
            }
        } catch (e) {
            logger.error('Removevip command error:', e);
        }
    });

    bot.command('checkvip', async (ctx) => {
        if (!adminCheck(ctx)) return;
        try {
            const parts = ctx.message.text.trim().split(/\s+/);
            const telegramId = parseInt(parts[1], 10);
            if (!telegramId) return ctx.reply('⚠️ Format: /checkvip 123456789');

            const user = await User.findOne({ telegramId }).lean();
            if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');

            const isVip = user.vipUntil && new Date(user.vipUntil) > new Date();
            const dateStr = user.vipUntil ? new Date(user.vipUntil).toLocaleString('uz-UZ') : 'Yo\'q';

            ctx.reply(
                `👤 <b>Foydalanuvchi:</b> ${escapeHtml(user.firstName || 'User')}\n` +
                `🆔 <b>ID:</b> <code>${user.telegramId}</code>\n` +
                `💎 <b>VIP holati:</b> ${isVip ? '✅ Faol' : '❌ Faol emas'}\n` +
                `📅 <b>VIP muddati:</b> ${dateStr}`,
                { parse_mode: 'HTML' }
            );
        } catch (e) {
            logger.error('Checkvip command error:', e);
        }
    });
};

export default setupAdminUserCommands;
