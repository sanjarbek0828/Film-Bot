import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';
import Channel from '../models/Channel.js';
import {
    getRequiredChannels,
    isSubscriptionEnabled,
    toggleSubscription,
    addChannel,
    removeChannel,
    clearChannels,
} from '../services/subscriptionService.js';
import { escapeHtml } from '../utils/html.js';

/**
 * Majburiy obuna sozlamalari sahnasi (Wizard).
 *
 * TAKOMILLASHTIRISHLAR:
 *  - Kanallarni alohida-alohida o'chirish imkoniyati (avval faqat hammasini birdan o'chirish bor edi).
 *  - Majburiy obunani yoqish/o'chirish (toggle) tugmasi.
 *  - Qo'shish va o'chirish amallarida subscriptionService orqali kesh to'liq tozalanadi.
 *  - Zamonaviy va qulay vizual interfeys.
 */

const renderChannelMenu = async (ctx) => {
    const channels = await Channel.find({}).lean();
    const enabled = await isSubscriptionEnabled();

    let msg = '📢 <b>Majburiy Obuna Sozlamalari</b>\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += `⚙️ <b>Tizim holati:</b> ${enabled ? '✅ <b>Faol (Yoqilgan)</b>' : '⏸ <b>Vaqtincha o\'chirilgan</b>'}\n\n`;

    const inlineButtons = [];

    if (channels.length > 0) {
        msg += '📋 <b>Ulangan homiy kanallar:</b>\n\n';
        channels.forEach((ch, i) => {
            const linkHtml = ch.inviteLink ? ` (<a href="${escapeHtml(ch.inviteLink)}">havola</a>)` : '';
            msg += `<b>${i + 1}.</b> 📢 <b>${escapeHtml(ch.name || 'Kanal')}</b>${linkHtml}\n`;
            msg += `   └ ID: <code>${ch.channelId}</code>\n\n`;

            inlineButtons.push([
                Markup.button.callback(
                    `🗑 O'chirish: ${ch.name ? ch.name.slice(0, 18) : ch.channelId}`,
                    `del_chan_${ch.channelId}`
                ),
            ]);
        });
    } else {
        msg += '⚠️ <i>Hozircha birorta ham majburiy kanal ulanmagan.</i>\n\n';
    }

    msg += '<i>➕ Yangi kanal qo\'shish uchun uning havolasi yoki usernamesini yuboring:</i>\n';
    msg += 'Masalan: <code>@meningkanalim</code> yoki <code>t.me/meningkanalim</code>';

    inlineButtons.push([
        Markup.button.callback(
            enabled ? '⏸ Majburiy obunani to\'xtatish' : '▶️ Majburiy obunani yoqish',
            'toggle_sub_status'
        ),
    ]);

    if (channels.length > 0) {
        inlineButtons.push([Markup.button.callback('🗑 Barcha kanallarni tozalash', 'clear_channels')]);
    }

    inlineButtons.push([Markup.button.callback('⬅️ Chiqish', 'exit_subscription')]);

    return { msg, keyboard: Markup.inlineKeyboard(inlineButtons) };
};

const mandatorySubscriptionScene = new Scenes.WizardScene(
    'MANDATORY_SUBSCRIPTION_SCENE',
    // Step 1: Kanallar ro'yxati va holatni ko'rsatish
    async (ctx) => {
        try {
            const { msg, keyboard } = await renderChannelMenu(ctx);
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Mandatory sub scene step 1 error:', e);
            ctx.reply('❌ Xatolik yuz berdi.').catch(() => {});
            return ctx.scene.leave();
        }
    },
    // Step 2: Kanal havolasini qabul qilish
    async (ctx) => {
        if (!ctx.message?.text) return;

        let input = ctx.message.text.trim();

        // t.me/username dan usernameni ajratib olish
        const linkMatch = input.match(/(?:t|telegram)\.me\/([a-zA-Z0-9_]+)/);
        if (linkMatch) {
            input = '@' + linkMatch[1];
        } else if (!input.startsWith('-100') && !input.startsWith('@')) {
            if (/^[a-zA-Z0-9_]{5,}$/.test(input)) {
                input = '@' + input;
            } else {
                return ctx.reply('⚠️ Noto\'g\'ri format. Kanal linki, ID yoki @username kiriting.', {
                    parse_mode: 'HTML',
                });
            }
        }

        try {
            const chat = await ctx.telegram.getChat(input);

            if (chat.type !== 'channel' && chat.type !== 'supergroup') {
                return ctx.reply('⚠️ Bu kanal yoki superguruh emas. Qaytadan urinib ko\'ring.');
            }

            const channelId = String(chat.id);

            const existing = await Channel.findOne({ channelId });
            if (existing) {
                return ctx.reply('⚠️ Bu kanal allaqachon qo\'shilgan.');
            }

            let inviteLink = '';
            if (chat.username) {
                inviteLink = `https://t.me/${chat.username}`;
            } else {
                try {
                    inviteLink = await ctx.telegram.exportChatInviteLink(channelId);
                } catch {
                    inviteLink = input.startsWith('http') ? input : '';
                }
            }

            const added = await addChannel(channelId, chat.title, inviteLink, ctx.from.id);
            if (!added) {
                return ctx.reply('❌ Kanalni saqlashda xatolik yuz berdi.');
            }

            await ctx.reply(
                `✅ <b>Kanal muvaffaqiyatli ulandi!</b>\n\n` +
                `📛 Nomi: <b>${escapeHtml(chat.title)}</b>\n` +
                `🆔 ID: <code>${channelId}</code>\n` +
                `🔗 Havola: ${inviteLink || 'Yo\'q'}\n\n` +
                `<i>Foydalanuvchilar botdan foydalanishdan oldin ushbu kanalga a'zo bo'lishlari shart.</i>`,
                { parse_mode: 'HTML', disable_web_page_preview: true }
            );

            // Yangilangan menyuni qayta ko'rsatish
            const { msg, keyboard } = await renderChannelMenu(ctx);
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        } catch (e) {
            logger.error('Channel add error:', e);
            return ctx.reply(
                '❌ <b>Kanal topilmadi yoki bot kanalga admin qilinmagan.</b>\n\n' +
                '1. Botni kanalga qo\'shib, unga ADMIN huquqini bering.\n' +
                '2. Kanal usernamesi yoki linkini to\'g\'ri yozing.\n' +
                '3. Qayta urinib ko\'ring.',
                { parse_mode: 'HTML' }
            );
        }
    }
);

// ═══ ACTIONS ═══

// Tizimni yoqish / o'chirish
mandatorySubscriptionScene.action('toggle_sub_status', async (ctx) => {
    try {
        const current = await isSubscriptionEnabled();
        await toggleSubscription(!current);
        await ctx.answerCbQuery(!current ? '✅ Majburiy obuna yoqildi' : '⏸ Majburiy obuna to\'xtatildi');

        const { msg, keyboard } = await renderChannelMenu(ctx);
        try {
            await ctx.editMessageText(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        } catch {
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        }
    } catch (e) {
        logger.error('toggle_sub_status error:', e);
        ctx.answerCbQuery('❌ Xatolik').catch(() => {});
    }
});

// Bitta kanalni o'chirish
mandatorySubscriptionScene.action(/^del_chan_(.+)$/, async (ctx) => {
    try {
        const channelId = ctx.match[1];
        await removeChannel(channelId);
        await ctx.answerCbQuery('🗑 Kanal o\'chirildi');

        const { msg, keyboard } = await renderChannelMenu(ctx);
        try {
            await ctx.editMessageText(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        } catch {
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        }
    } catch (e) {
        logger.error('del_chan error:', e);
        ctx.answerCbQuery('❌ Xatolik').catch(() => {});
    }
});

// Barcha kanallarni tozalash
mandatorySubscriptionScene.action('clear_channels', async (ctx) => {
    try {
        await clearChannels();
        await ctx.answerCbQuery('🗑 Barcha kanallar tozalandi');

        const { msg, keyboard } = await renderChannelMenu(ctx);
        try {
            await ctx.editMessageText(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        } catch {
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard,
            });
        }
    } catch (e) {
        logger.error('Clear channels error:', e);
        ctx.answerCbQuery('❌ Xatolik').catch(() => {});
    }
});

// Chiqish
mandatorySubscriptionScene.action('exit_subscription', async (ctx) => {
    await ctx.answerCbQuery('Sozlamalar saqlandi').catch(() => {});
    try {
        await ctx.deleteMessage().catch(() => {});
    } catch {}
    await ctx.reply('✅ Majburiy obuna sozlamalari saqlandi.').catch(() => {});
    return ctx.scene.leave();
});

export default mandatorySubscriptionScene;
