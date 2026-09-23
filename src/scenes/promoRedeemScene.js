import { Scenes, Markup } from 'telegraf';
import logger from '../utils/logger.js';

import PromoCode from '../models/PromoCode.js';
import { logAdminAction } from '../models/AdminLog.js';
import { extendVip } from '../services/userService.js';
import { sendMainMenu } from '../utils/menuUtils.js';

const redeemSchema = new Scenes.WizardScene(
    'REDEEM_PROMO_SCENE',
    async (ctx) => {
        try {
            await ctx.reply('🎫 <b>Promokodni kiriting:</b>\n\n<i>Bekor qilish uchun "❌ Bekor qilish" tugmasini bosing.</i>', {
                parse_mode: 'HTML',
                ...Markup.keyboard([['❌ Bekor qilish']]).resize()
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Promo scene enter error:', e);
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        try {
            // Text mavjudligini tekshirish
            if (!ctx.message || !ctx.message.text) {
                await ctx.reply('⚠️ Iltimos, promokod matnini kiriting.');
                return; // Scenariyda qolish
            }

            const text = ctx.message.text.trim();

            // Bekor qilish
            if (text === '❌ Bekor qilish') {
                await ctx.reply('❌ Bekor qilindi.', Markup.removeKeyboard());
                setTimeout(() => sendMainMenu(ctx), 500);
                return ctx.scene.leave();
            }

            const inputCode = text.toUpperCase();
            const userIdStr = ctx.from.id.toString();

            // Atomik promokod sarflash (race-condition himoyasi)
            const updatedPromo = await PromoCode.findOneAndUpdate(
                {
                    code: inputCode,
                    usedBy: { $ne: userIdStr },
                    $expr: { $lt: [{ $size: '$usedBy' }, '$usageLimit'] },
                    $or: [
                        { expiryDate: null },
                        { expiryDate: { $gt: new Date() } }
                    ]
                },
                {
                    $push: { usedBy: userIdStr }
                },
                { new: true }
            );

            if (!updatedPromo) {
                const existing = await PromoCode.findOne({ code: inputCode });
                if (!existing) {
                    await ctx.reply('❌ <b>Bunday promokod mavjud emas.</b>\n\n<i>Qayta urinib ko\'ring yoki "❌ Bekor qilish" bosing.</i>', { parse_mode: 'HTML' });
                    return; // Scenariyda qolish
                }

                if (existing.expiryDate && new Date() > existing.expiryDate) {
                    await ctx.reply('❌ <b>Bu promokod muddati tugagan.</b>', { parse_mode: 'HTML', ...Markup.removeKeyboard() });
                } else if (existing.usedBy.includes(userIdStr)) {
                    await ctx.reply('⚠️ <b>Siz bu promokodni allaqachon ishlatgansiz.</b>', { parse_mode: 'HTML', ...Markup.removeKeyboard() });
                } else {
                    await ctx.reply(`❌ <b>Bu promokod to'liq ishlatib bo'lingan.</b>\n\n👥 Limit: ${existing.usageLimit} ta odam`, { parse_mode: 'HTML', ...Markup.removeKeyboard() });
                }
                setTimeout(() => sendMainMenu(ctx), 500);
                return ctx.scene.leave();
            }

            const days = updatedPromo.rewardDays || 1;
            const user = await extendVip(ctx.from.id, days, 'promo');
            if (!user) {
                await ctx.reply('❌ Foydalanuvchi topilmadi.', Markup.removeKeyboard());
                return ctx.scene.leave();
            }

            logAdminAction('SYSTEM', 'promo_redeem', ctx.from.id,
                `Redeemed ${inputCode} (+${days} days VIP). Remaining uses: ${updatedPromo.usageLimit - updatedPromo.usedBy.length}`);

            // Muvaffaqiyat xabari
            const successMsg = `✅ <b>Tabriklaymiz!</b>\n\n` +
                `🎫 Promokod: <code>${inputCode}</code>\n` +
                `💎 Mukofot: <b>${days} kunlik VIP</b>\n\n` +
                `<i>Endi barcha VIP imkoniyatlardan foydalaning!</i>`;

            await ctx.reply(successMsg, { parse_mode: 'HTML', ...Markup.removeKeyboard() });

            // VIP ogohlantirish xabari
            const vipNoticeMsg = `🔄 <b>MUHIM!</b>\n\n` +
                `Sizning VIP obunangiz <b>aktiv</b> bo'ldi.\n\n` +
                `💎 <b>VIP imkoniyatlar:</b>\n` +
                `├ 🎬 Barcha kinolarga cheklovsiz kirish\n` +
                `├ 💬 Sharh qoldirish va o'qish\n` +
                `├ ⭐ Sevimlilar ro'yxati\n` +
                `├ 📜 Ko'rish tarixi\n` +
                `├ 🎰 Tasodifiy kino\n` +
                `├ 🎫 Promokod ishlatish\n` +
                `└ ⚠️ Shikoyat yuborish\n\n` +
                `<i>Menyu yangilandi, davom etishingiz mumkin.</i>`;

            await ctx.reply(vipNoticeMsg, { parse_mode: 'HTML' });

            setTimeout(() => sendMainMenu(ctx), 2000);

            return ctx.scene.leave();

        } catch (e) {
            logger.error('Promo redeem error:', e);
            await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.', Markup.removeKeyboard());
            setTimeout(() => sendMainMenu(ctx), 500);
            return ctx.scene.leave();
        }
    }
);

export default redeemSchema;
