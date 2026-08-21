import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import { getBroadcastRecipients, countUsers } from '../services/userService.js';
import { broadcast } from '../utils/broadcaster.js';
import User from '../models/User.js';

/**
 * Reklama tarqatish wizardi.
 *
 * TUZATILGAN BUGLAR:
 *  - Eski kod har foydalanuvchini ketma-ket 40ms tanaffus bilan yuborardi
 *    (10k user ≈ 7 daqiqa) va 429 xatosini hisobga olmasdi. Endi `broadcaster`
 *    yordamida cheklangan parallellik + `retry_after` bilan.
 *  - `users[i].save()` har bir yuborishda alohida DB yozuvi qilardi
 *    (10k user = 10k yozuv, bazani cho'ktiradi). Endi `lastBroadcastMsgId`
 *    faqat kerak bo'lganda va ommaviy yozilmaydi.
 *  - Progress endi throttle bilan yangilanadi (Telegram limitiga tushmaydi).
 */

const broadcastScene = new Scenes.WizardScene(
    'BROADCAST_SCENE',
    // Step 0: Xabarni so'rash
    async (ctx) => {
        await ctx.reply('📢 <b>Reklama yuborish</b>\n\nYuboriladigan matn, rasm yoki videoni yuboring:', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')]]),
        });
        return ctx.wizard.next();
    },
    // Step 1: Xabarni saqlash + auditoriya
    async (ctx) => {
        try {
            if (ctx.callbackQuery?.data === 'cancel_broadcast') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => {});
                return ctx.scene.leave();
            }
            if (!ctx.message) return;

            const message = {};
            if (ctx.message.text) {
                message.type = 'text';
                message.content = ctx.message.text;
                message.entities = ctx.message.entities;
            } else if (ctx.message.photo) {
                message.type = 'photo';
                message.fileId = ctx.message.photo.at(-1).file_id;
                message.caption = ctx.message.caption || '';
                message.captionEntities = ctx.message.caption_entities;
            } else if (ctx.message.video) {
                message.type = 'video';
                message.fileId = ctx.message.video.file_id;
                message.caption = ctx.message.caption || '';
                message.captionEntities = ctx.message.caption_entities;
            } else {
                return ctx.reply('⚠️ Faqat matn, rasm yoki video yuboring.');
            }

            ctx.wizard.state.message = message;

            await ctx.reply('🎯 <b>Kimlarga yuborilsin?</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('👥 Barchaga', 'target_all')],
                    [Markup.button.callback('💎 Faqat VIP larga', 'target_vip')],
                    [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')],
                ]),
            });
            return ctx.wizard.next();
        } catch (error) {
            logger.error('broadcast step1:', error);
            return ctx.scene.leave();
        }
    },
    // Step 2: Auditoriya tanlash + tasdiqlash
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return;
            const target = ctx.callbackQuery.data;

            if (target === 'cancel_broadcast') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => {});
                return ctx.scene.leave();
            }
            if (target !== 'target_all' && target !== 'target_vip') return;

            await ctx.answerCbQuery().catch(() => {});
            const vipOnly = target === 'target_vip';
            ctx.wizard.state.vipOnly = vipOnly;

            const filter = { isBanned: { $ne: true } };
            if (vipOnly) filter.vipUntil = { $gt: new Date() };
            const count = await countUsers(filter).catch(() => 0);

            await ctx.editMessageText(
                `📋 <b>Tasdiqlash</b>\n\n` +
                `🎯 Auditoriya: ${vipOnly ? '💎 VIP foydalanuvchilar' : '👥 Barcha foydalanuvchilar'}\n` +
                `👥 Soni: <b>${count}</b> ta\n` +
                `📎 Xabar turi: ${ctx.wizard.state.message.type}`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('✅ Yuborish', 'confirm_send')],
                        [Markup.button.callback('❌ Bekor qilish', 'cancel_broadcast')],
                    ]),
                }
            );
            return ctx.wizard.next();
        } catch (error) {
            logger.error('broadcast step2:', error);
            return ctx.scene.leave();
        }
    },
    // Step 3: Yuborish
    async (ctx) => {
        try {
            if (!ctx.callbackQuery) return;
            const action = ctx.callbackQuery.data;

            if (action === 'cancel_broadcast') {
                await ctx.answerCbQuery().catch(() => {});
                await ctx.editMessageText('❌ Bekor qilindi.').catch(() => {});
                return ctx.scene.leave();
            }
            if (action !== 'confirm_send') return;

            await ctx.answerCbQuery('Yuborilmoqda...').catch(() => {});

            const { message, vipOnly } = ctx.wizard.state;
            const recipients = await getBroadcastRecipients({ vipOnly });
            const chatId = ctx.chat.id;
            const progressMsgId = ctx.callbackQuery.message.message_id;
            const sentIds = [];

            await ctx.telegram.editMessageText(chatId, progressMsgId, null, `🚀 Yuborish boshlandi... 0/${recipients.length}`).catch(() => {});

            // Scene'ni bo'shatamiz — yuborish fonda davom etadi
            ctx.scene.leave().catch(() => {});

            const send = async (userId) => {
                const opts = { parse_mode: 'HTML' };
                let sent;
                if (message.type === 'text') {
                    sent = await ctx.telegram.sendMessage(userId, message.content, opts);
                } else if (message.type === 'photo') {
                    sent = await ctx.telegram.sendPhoto(userId, message.fileId, { ...opts, caption: message.caption || undefined });
                } else if (message.type === 'video') {
                    sent = await ctx.telegram.sendVideo(userId, message.fileId, { ...opts, caption: message.caption || undefined });
                }
                if (sent) sentIds.push({ telegramId: userId, msgId: sent.message_id });
            };

            const result = await broadcast({
                recipients,
                send,
                onProgress: ({ sent, blocked, failed, total }) => {
                    ctx.telegram
                        .editMessageText(chatId, progressMsgId, null, `🚀 Yuborilmoqda... ${sent + blocked + failed}/${total}\n✅ ${sent}`)
                        .catch(() => {});
                },
            });

            // Oxirgi broadcast msg ID larni saqlaymiz (keyin ommaviy o'chirish uchun) — bitta bulk operatsiya
            if (sentIds.length > 0) {
                const ops = sentIds.map(({ telegramId, msgId }) => ({
                    updateOne: { filter: { telegramId }, update: { $set: { lastBroadcastMsgId: msgId } } },
                }));
                await User.bulkWrite(ops, { ordered: false }).catch(() => {});
            }

            await ctx.telegram.editMessageText(
                chatId, progressMsgId, null,
                `✅ <b>Tarqatish yakunlandi!</b>\n\n` +
                `✅ Yetkazildi: ${result.sent}\n` +
                `🚫 Bloklaganlar: ${result.blocked}\n` +
                `❌ Xatolik: ${result.failed}\n` +
                `👥 Jami: ${result.total}`,
                { parse_mode: 'HTML' }
            ).catch(() => {});
        } catch (error) {
            logger.error('broadcast send:', error);
            await ctx.reply('❌ Tarqatishda xatolik yuz berdi.').catch(() => {});
            return ctx.scene.leave();
        }
    }
);

broadcastScene.action('cancel_broadcast', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText('❌ Bekor qilindi.').catch(() => {});
    return ctx.scene.leave();
});

export default broadcastScene;
