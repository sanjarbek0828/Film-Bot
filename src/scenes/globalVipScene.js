import { Scenes, Markup } from 'telegraf';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { broadcast } from '../utils/broadcaster.js';
import { setJsonConfig, CONFIG_KEYS } from '../services/configService.js';
import { flushAll } from '../utils/cache.js';

const globalVipScene = new Scenes.WizardScene(
    'GLOBAL_VIP_SCENE',
    // 1-qadam: Muddatni so'rash
    async (ctx) => {
        try {
            await ctx.reply('🌐 <b>GLOBAL VIP BERYAPSIZ</b>\n\nBarcha foydalanuvchilarga xizmat ko\'rsatadigan VIP muddatini (KUN hisobida) faqat raqamda kiriting:\n\n<i>Masalan: 3</i>\n<i>Bekor qilish uchun <b>/cancel</b> yozing.</i>', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]]) });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 2-qadam: Xabar, Rasm, Video qabul qilish
    async (ctx) => {
        try {
            if ((ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_vip') || (ctx.message && ctx.message.text === '/cancel')) {
                if(ctx.callbackQuery) await ctx.answerCbQuery().catch(()=>{});
                await ctx.reply('❌ Barchaga VIP berish bekor qilindi.');
                return ctx.scene.leave();
            }

            if(!ctx.message || !ctx.message.text) return;
            const days = parseInt(ctx.message.text);
            if (isNaN(days) || days <= 0) {
                await ctx.reply('❌ Faqat musbat raqam kiriting (masalan: 3). Qaytadan raqam yozing:');
                return; // Wizard kutib turadi
            }
            ctx.wizard.state.days = days;

            await ctx.reply('📸 <b>Tabrik Xabari</b>\n\nFoydalanuvchilarga sovg\'a bilan birga boradigan Rasmli tabrik postini (yoki faqat matnni) yuboring:', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]])
            });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 3-qadam: Tasdiqlash
    async (ctx) => {
        try {
            if ((ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_vip') || (ctx.message && ctx.message.text === '/cancel')) {
                if(ctx.callbackQuery) await ctx.answerCbQuery().catch(()=>{});
                await ctx.reply('❌ Bekor qilindi.');
                return ctx.scene.leave();
            }
            
            if (!ctx.message) return;

            ctx.wizard.state.message = {};
            if (ctx.message.text) {
                ctx.wizard.state.message.type = 'text';
                ctx.wizard.state.message.content = ctx.message.text;
            } else if (ctx.message.photo) {
                ctx.wizard.state.message.type = 'photo';
                ctx.wizard.state.message.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                ctx.wizard.state.message.caption = ctx.message.caption || '';
            } else if (ctx.message.video) {
                ctx.wizard.state.message.type = 'video';
                ctx.wizard.state.message.fileId = ctx.message.video.file_id;
                ctx.wizard.state.message.caption = ctx.message.caption || '';
            } else {
                return ctx.reply('⚠️ Faqat matn, rasm yoki video yuboring.');
            }

            const count = await User.countDocuments();
            
            await ctx.reply(`📋 <b>Hamma narsa tayyor. Boshlaymizmi?</b>\n\n👥 Qamrov: ${count} ta foydalanuvchi\n💎 Beriladigan VIP: ${ctx.wizard.state.days} KUN\n📧 Xabar turi: ${ctx.wizard.state.message.type}`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([  
                    [Markup.button.callback('🚀 Barchaga Tarqatish', 'start_global_vip')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_vip')]
                ])
            });
            return ctx.wizard.next();
        } catch (e) {
            return ctx.scene.leave();
        }
    },
    // 4-qadam: Tarqatish (Loop)
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return;
            const action = ctx.callbackQuery.data;

            if (action === 'cancel_vip') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText('❌ Bekor qilindi.').catch(()=>{});
                return ctx.scene.leave();
            }

            if (action === 'start_global_vip') {
                await ctx.answerCbQuery('Jarayon boshlandi...').catch(() => {});
                const msgData = ctx.wizard.state.message;
                const days = ctx.wizard.state.days;

                const now = new Date();
                const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                const chatId = ctx.chat.id;
                const progressMsgId = ctx.callbackQuery.message.message_id;

                await ctx.editMessageText(`🚀 <b>VIP berilmoqda...</b>`, { parse_mode: 'HTML' }).catch(() => {});

                // Scene'ni bo'shatamiz — jarayon fonda davom etadi
                ctx.scene.leave().catch(() => {});

                (async () => {
                    // 1) Hammaga bazada VIP ni ilib qo'yamiz (bitta so'rov)
                    await User.updateMany(
                        {
                            $or: [
                                { vipUntil: { $exists: false } },
                                { vipUntil: { $lt: targetDate } },
                                { vipUntil: null },
                            ],
                        },
                        { $set: { vipUntil: targetDate, vipNotified: false } }
                    );

                    // Kesh eskirganini bildiramiz (yangi VIP holati kuchga kirsin)
                    flushAll();

                    // 2) Aksiya xotirasini saqlaymiz (yangi kelganlarga ham berish uchun)
                    await setJsonConfig(CONFIG_KEYS.LATEST_GLOBAL_VIP, {
                        targetDate: targetDate.getTime(),
                        message: msgData,
                    }).catch(() => {});

                    // 3) Xabarni rate-limitga chidamli tarqatamiz
                    const rows = await User.find().select('telegramId').lean();
                    const recipients = rows.map((row) => row.telegramId);

                    const send = (userId) => {
                        const opts = { parse_mode: 'HTML' };
                        if (msgData.type === 'text') return ctx.telegram.sendMessage(userId, `💎 ${msgData.content}`, opts);
                        if (msgData.type === 'photo') return ctx.telegram.sendPhoto(userId, msgData.fileId, { ...opts, caption: msgData.caption ? `💎 ${msgData.caption}` : undefined });
                        if (msgData.type === 'video') return ctx.telegram.sendVideo(userId, msgData.fileId, { ...opts, caption: msgData.caption ? `💎 ${msgData.caption}` : undefined });
                        return Promise.resolve();
                    };

                    const result = await broadcast({
                        recipients,
                        send,
                        onProgress: ({ sent, total }) => {
                            ctx.telegram.editMessageText(chatId, progressMsgId, null, `🚀 <b>Tarqatilmoqda...</b> ${sent}/${total}`, { parse_mode: 'HTML' }).catch(() => {});
                        },
                    });

                    await ctx.telegram.editMessageText(
                        chatId, progressMsgId, null,
                        `✅ <b>GLOBAL VIP BARCHAGA BERILDI!</b>\n\n🎯 Muddat: ${days} kun\n✅ Xabar yetdi: ${result.sent}\n🚫 Bloklaganlar: ${result.blocked}\n👥 Jami: ${result.total}`,
                        { parse_mode: 'HTML' }
                    ).catch(() => {});
                })().catch((err) => logger.error('Global VIP broadcast:', err));

                return;
            }
        } catch (e) {
            return ctx.scene.leave();
        }
    }
);

export default globalVipScene;
