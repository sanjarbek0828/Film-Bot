import { Markup } from 'telegraf';
import logger from '../../utils/logger.js';
import User from '../../models/User.js';
import Movie from '../../models/Movie.js';
import AdminLog, { logAdminAction } from '../../models/AdminLog.js';
import { countMovies } from '../../services/movieService.js';
import { isAdmin } from '../../utils/adminHelper.js';
import { resetUserCaches } from '../../bot/middleware.js';
import { escapeHtml } from '../../utils/html.js';
import { isDbConnected } from '../../config/db.js';

export const setupAdminSystemCommands = (bot, { adminCheck, superAdminCheck }) => {
    // ═══ TIZIM & STATISTIKA MENYUSI ═══
    bot.action('admin_menu_system', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});

        const buttons = [
            [
                Markup.button.callback('📊 To\'liq Statistika', 'admin_stats'),
                Markup.button.callback('🎬 Start Xabar/GIF', 'admin_start_gif'),
            ],
            [
                Markup.button.callback('🖥 Server Holati', 'admin_server'),
                Markup.button.callback('🗂 Admin Loglari', 'admin_logs'),
            ],
            [
                Markup.button.callback('💾 Bazani Zaxiralash', 'admin_backup'),
                Markup.button.callback('👮‍♂️ Adminlar', 'admin_admins'),
            ],
            [
                Markup.button.callback('⬅️ Bosh menyu', 'admin_main_menu'),
            ],
        ];

        const text = `⚙️ <b>Tizim & Statistika Boshqaruvi</b>\n\n` +
            `Server, ma'lumotlar bazasi zaxirasi, admin loglari va to'liq analitika.\n\n` +
            `👇 Kerakli bo'limni tanlang:`;

        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch {
            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        }
    });

    bot.action('admin_start_gif', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.scene.enter('START_GIF_SCENE');
    });

    // ═══ BIRLASHTIRILGAN INTERAKTIV STATISTIKA ═══
    bot.action('admin_stats', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery('📊 Yangilanmoqda...').catch(() => {});

            const totalUsers = await User.countDocuments({}).catch(() => 0);
            const activeVips = await User.countDocuments({ vipUntil: { $gt: new Date() } }).catch(() => 0);
            const bannedCount = await User.countDocuments({ isBanned: true }).catch(() => 0);
            const movieCount = await countMovies().catch(() => 0);

            const viewsAggr = await Movie.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]).catch(() => []);
            const totalViews = viewsAggr[0]?.total || 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);
            const newMoviesToday = await Movie.countDocuments({ createdAt: { $gte: today } }).catch(() => 0);

            const avgViews = movieCount > 0 ? Math.round(totalViews / movieCount) : 0;

            const msg = `📊 <b>FilmX — To'liq Analitika va Statistika</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👥 <b>Foydalanuvchilar:</b>\n` +
                `├ Jami a'zolar: <b>${totalUsers.toLocaleString()}</b> ta\n` +
                `├ Bugun qo'shilgan: <b>+${newUsersToday}</b> ta\n` +
                `├ 💎 VIP a'zolar: <b>${activeVips}</b> ta\n` +
                `└ 🚫 Bloklanganlar: <b>${bannedCount}</b> ta\n\n` +
                `🎬 <b>Kinolar bazasi:</b>\n` +
                `├ Jami kinolar: <b>${movieCount.toLocaleString()}</b> ta\n` +
                `├ Bugun qo'shilgan: <b>+${newMoviesToday}</b> ta\n` +
                `├ 👁 Jami ko'rishlar: <b>${totalViews.toLocaleString()}</b> marta\n` +
                `└ 📈 O'rtacha ko'rish: <b>${avgViews}</b> marta / film\n\n` +
                `🕒 <i>Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}</i>`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Yangilash', 'admin_stats')],
                [Markup.button.callback('⬅️ Tizim menyusi', 'admin_menu_system')],
            ]);

            try {
                await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
            } catch {
                await ctx.reply(msg, { parse_mode: 'HTML', ...keyboard });
            }
        } catch (e) {
            logger.error('Admin stats error:', e);
        }
    });

    // ═══ SERVER HOLATI ═══
    bot.action('admin_server', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const uptime = process.uptime();
            const uptimeHrs = Math.floor(uptime / 3600);
            const uptimeMins = Math.floor((uptime % 3600) / 60);

            const memoryUsage = process.memoryUsage();
            const ramUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
            const rssUsed = (memoryUsage.rss / 1024 / 1024).toFixed(1);

            const msg = `🖥 <b>Server va Tizim Holati:</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🟢 <b>Uptime:</b> ${uptimeHrs} soat ${uptimeMins} daqiqa\n` +
                `🧠 <b>RAM (Heap):</b> ${ramUsed} MB / <b>RSS:</b> ${rssUsed} MB\n` +
                `⚡️ <b>Node.js:</b> ${process.version}\n` +
                `🗄 <b>MongoDB:</b> ${isDbConnected() ? '✅ Ulangan' : '❌ Uzilgan'}\n` +
                `🕒 <b>Server vaqti:</b> ${new Date().toLocaleString('uz-UZ')}`;

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Tizim menyusi', 'admin_menu_system')]
            ]));
        } catch (e) {
            logger.error('Admin server action error:', e);
        }
    });

    // ═══ ADMIN LOGLARI ═══
    bot.action('admin_logs', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.answerCbQuery('❌ Faqat Bosh Admin uchun!', { show_alert: true });
        try {
            await ctx.answerCbQuery().catch(() => {});
            const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(10).lean();
            if (logs.length === 0) return ctx.reply('📭 Loglar tarixi bo\'sh.');

            let msg = '🛡 <b>So\'nggi 10 ta Admin Harakati:</b>\n\n';
            logs.forEach((l) => {
                const date = new Date(l.createdAt).toLocaleDateString('uz-UZ');
                msg += `📅 ${date} | 👮‍♂️ <code>${l.adminId}</code>\n` +
                    `⚡️ <b>${escapeHtml(l.action)}</b> ➔ 🎯 <code>${l.targetId || 'N/A'}</code>\n` +
                    `📝 <i>${escapeHtml(l.details || '')}</i>\n\n`;
            });

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Tizim menyusi', 'admin_menu_system')]
            ]));
        } catch (e) {
            logger.error('Admin logs error:', e);
        }
    });

    // ═══ ZAXIRA NUSXA (BACKUP) ═══
    bot.action('admin_backup', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.answerCbQuery('❌ Faqat Bosh Admin uchun!', { show_alert: true });
        try {
            await ctx.answerCbQuery('💾 Zaxira tayyorlanmoqda...').catch(() => {});
            const users = await User.find({}).lean();
            const movies = await Movie.find({}).lean();

            const backupData = {
                generatedAt: new Date().toISOString(),
                stats: { totalUsers: users.length, totalMovies: movies.length },
                users,
                movies,
            };

            const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
            const fileName = `FilmXBot_Backup_${new Date().toISOString().split('T')[0]}.json`;

            await ctx.replyWithDocument(
                { source: buffer, filename: fileName },
                {
                    caption: `✅ <b>Avtomatik Xavfsizlik Zaxirasi (${fileName})</b>\n\n` +
                        `👥 Foydalanuvchilar: <b>${users.length}</b> ta\n` +
                        `🎬 Kinolar: <b>${movies.length}</b> ta\n\n` +
                        `🔒 <i>Ushbu fayl maxfiy ma'lumotlarni o'z ichiga oladi. Uni boshqalarga uzatmang.</i>`,
                    parse_mode: 'HTML',
                }
            );
        } catch (e) {
            logger.error('Backup error:', e);
            ctx.reply('❌ Zaxira nusxa yaratishda xatolik yuz berdi.').catch(() => {});
        }
    });

    // ═══ ADMINLAR BOSHQARUVI ═══
    bot.action('admin_admins', async (ctx) => {
        if (!adminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).lean();

            let msg = '👮‍♂️ <b>Bot Adminlari:</b>\n\n';
            admins.forEach((a) => {
                const isSuper = isAdmin(a.telegramId);
                const name = escapeHtml(a.firstName || a.username || 'Admin');
                msg += `👤 <b>${name}</b> ${isSuper ? '👑 (Bosh Admin)' : '👮‍♂️ (Yordamchi)'}\n🆔 <code>${a.telegramId}</code>\n\n`;
            });

            const buttons = [];
            if (superAdminCheck(ctx)) {
                buttons.push([
                    Markup.button.callback('➕ Admin qo\'shish', 'add_admin_info'),
                    Markup.button.callback('🗑 Admin o\'chirish', 'remove_admin_list'),
                ]);
            }
            buttons.push([Markup.button.callback('⬅️ Tizim menyusi', 'admin_menu_system')]);

            return ctx.replyWithHTML(msg, Markup.inlineKeyboard(buttons));
        } catch (e) {
            logger.error('Admin admins error:', e);
        }
    });

    bot.action('add_admin_info', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.answerCbQuery('❌');
        await ctx.answerCbQuery().catch(() => {});
        return ctx.reply(
            `➕ <b>Admin tayinlash uchun buyruqdan foydalaning:</b>\n\n` +
            `<code>/makeadmin TELEGRAM_ID</code>\n\n` +
            `<i>Misol: <code>/makeadmin 123456789</code></i>`,
            { parse_mode: 'HTML' }
        );
    });

    bot.action('remove_admin_list', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.answerCbQuery('❌');
        try {
            await ctx.answerCbQuery().catch(() => {});
            const admins = await User.find({ role: 'admin' }).lean();
            if (admins.length === 0) return ctx.reply('📭 O\'chirish mumkin bo\'lgan oddiy adminlar yo\'q.');

            const buttons = admins.map((a) => [
                Markup.button.callback(`🗑 ${a.firstName || a.username || 'Admin'} (${a.telegramId})`, `del_admin_${a.telegramId}`)
            ]);
            buttons.push([Markup.button.callback('⬅️ Orqaga', 'admin_admins')]);

            return ctx.reply('🗑 <b>Huquqini bekor qilish uchun adminni tanlang:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons),
            });
        } catch (e) {
            logger.error('Remove admin list error:', e);
        }
    });

    bot.action(/^del_admin_(\d+)$/, async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.answerCbQuery('❌');
        const targetId = parseInt(ctx.match[1], 10);

        if (isAdmin(targetId)) {
            return ctx.answerCbQuery('❌ Bosh adminni o\'chirib bo\'lmaydi!', { show_alert: true });
        }

        try {
            await User.findOneAndUpdate({ telegramId: targetId }, { $set: { role: 'user' } });
            resetUserCaches(targetId);
            logAdminAction(ctx.from.id, 'remove_admin', targetId, 'Demoted to User');
            await ctx.answerCbQuery('✅ Admin olib tashlandi');
            await ctx.editMessageText(`✅ <code>${targetId}</code> ning adminlik huquqi bekor qilindi.`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'admin_admins')]]),
            });
        } catch (e) {
            logger.error('Del admin error:', e);
        }
    });

    // ═══ TEXT COMMANDS ═══
    bot.command('makeadmin', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.reply('❌ Bu buyruq faqat Bosh Admin uchun!');
        const telegramId = parseInt(ctx.message.text.trim().split(/\s+/)[1], 10);
        if (!telegramId) return ctx.reply('⚠️ Format: /makeadmin 123456789');

        const user = await User.findOne({ telegramId });
        if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi. Avval botga start bosishi kerak.');

        user.role = 'admin';
        await user.save();
        resetUserCaches(telegramId);
        logAdminAction(ctx.from.id, 'make_admin', telegramId, 'Promoted to Admin');

        ctx.reply(`✅ <b>Yangi Admin tayinlandi!</b>\n\n👤 ${escapeHtml(user.firstName || 'User')} (<code>${telegramId}</code>) endi bot admini.`, { parse_mode: 'HTML' });
        ctx.telegram.sendMessage(telegramId, '👮‍♂️ <b>Tabriklaymiz!</b>\n\nSizga FilmXBotda <b>Admin</b> huquqi berildi.\n/admin buyrug\'ini yuborib panelga kirishingiz mumkin.', { parse_mode: 'HTML' }).catch(() => {});
    });

    bot.command('removeadmin', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.reply('❌ Bu buyruq faqat Bosh Admin uchun!');
        const telegramId = parseInt(ctx.message.text.trim().split(/\s+/)[1], 10);
        if (!telegramId) return ctx.reply('⚠️ Format: /removeadmin 123456789');

        if (isAdmin(telegramId)) return ctx.reply('❌ Bosh Adminni o\'chira olmaysiz!');

        const user = await User.findOne({ telegramId });
        if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');

        user.role = 'user';
        await user.save();
        resetUserCaches(telegramId);
        logAdminAction(ctx.from.id, 'remove_admin', telegramId, 'Demoted to User');

        ctx.reply(`✅ <b>Admin olib tashlandi:</b> <code>${telegramId}</code> endi oddiy foydalanuvchi.`);
        ctx.telegram.sendMessage(telegramId, '⚠️ Sizning Adminlik huquqingiz bekor qilindi.', { parse_mode: 'HTML' }).catch(() => {});
    });

    bot.command('server', async (ctx) => {
        if (!adminCheck(ctx)) return;
        const uptime = process.uptime();
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        ctx.reply(`🖥 <b>Server:</b>\nUptime: ${hrs}h ${mins}m\nRAM: ${mem} MB\nNode: ${process.version}\nDB: ${isDbConnected() ? '✅' : '❌'}`, { parse_mode: 'HTML' });
    });

    bot.command('toadmins', async (ctx) => {
        if (!superAdminCheck(ctx)) return ctx.reply('❌ Faqat Bosh Admin uchun!');
        const text = ctx.message.text.trim().split(/\s+/).slice(1).join(' ');
        if (!text) return ctx.reply('⚠️ Format: /toadmins Xabar matni');

        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).lean();
        let sent = 0;
        for (const a of admins) {
            try {
                await ctx.telegram.sendMessage(a.telegramId, `📢 <b>Bosh Admindan xabar:</b>\n\n${escapeHtml(text)}`, { parse_mode: 'HTML' });
                sent++;
            } catch {}
        }
        ctx.reply(`✅ Xabar <b>${sent} ta</b> adminga yetkazildi.`, { parse_mode: 'HTML' });
    });
};

export default setupAdminSystemCommands;
