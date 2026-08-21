import { Scenes, Markup } from 'telegraf';
import PromoCode from '../models/PromoCode.js';
import logger from '../utils/logger.js';

/**
 * Promokod yaratish wizardi.
 *
 * TUZATILGAN BUGLAR:
 *  - `ctx.message.text` — foydalanuvchi rasm/stiker yuborsa `undefined` bo'lib,
 *    `.toUpperCase()` crash qilardi. Endi har qadamda matn tekshiriladi.
 *  - Bekor qilishda klaviatura tozalanmasdi.
 */

const CANCEL = '❌ Bekor qilish';

const isCancel = (ctx) => ctx.message?.text === CANCEL || ctx.message?.text === '/cancel';

const leaveCancelled = async (ctx) => {
    await ctx.reply('❌ Bekor qilindi.', Markup.removeKeyboard()).catch(() => {});
    return ctx.scene.leave();
};

const promoWizard = new Scenes.WizardScene(
    'PROMO_WIZARD_SCENE',
    // Step 1: Kod nomi
    (ctx) => {
        ctx.reply('🎫 <b>Promokod nomini kiriting:</b>\n\nMasalan: <code>YANGIYIL2025</code>', {
            parse_mode: 'HTML',
            ...Markup.keyboard([[CANCEL]]).resize(),
        });
        return ctx.wizard.next();
    },
    // Step 2: Foydalanish limiti
    (ctx) => {
        if (isCancel(ctx)) return leaveCancelled(ctx);
        if (!ctx.message?.text) return ctx.reply('⚠️ Iltimos, matn kiriting.');

        ctx.wizard.state.code = ctx.message.text.toUpperCase().trim();
        ctx.reply('🔢 <b>Nechta odam ishlata oladi?</b>\n\nMasalan: <code>50</code>', { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 3: Mukofot kunlari
    (ctx) => {
        if (isCancel(ctx)) return leaveCancelled(ctx);
        const limit = parseInt(ctx.message?.text, 10);
        if (!Number.isFinite(limit) || limit <= 0) return ctx.reply('⚠️ Iltimos, to\'g\'ri raqam kiriting.');

        ctx.wizard.state.limit = limit;
        ctx.reply('💎 <b>Necha kunlik VIP berilsin?</b>\n\nMasalan: <code>3</code> (kun)', { parse_mode: 'HTML' });
        return ctx.wizard.next();
    },
    // Step 4: Yakunlash
    async (ctx) => {
        if (isCancel(ctx)) return leaveCancelled(ctx);
        const days = parseInt(ctx.message?.text, 10);
        if (!Number.isFinite(days) || days <= 0) return ctx.reply('⚠️ Iltimos, to\'g\'ri raqam kiriting.');

        try {
            await PromoCode.create({
                code: ctx.wizard.state.code,
                usageLimit: ctx.wizard.state.limit,
                rewardDays: days,
                createdBy: ctx.from.id.toString(),
            });

            await ctx.reply(
                `✅ <b>Promokod yaratildi!</b>\n\n` +
                `🎫 Kod: <code>${ctx.wizard.state.code}</code>\n` +
                `👥 Limit: <b>${ctx.wizard.state.limit} ta</b>\n` +
                `💎 Mukofot: <b>${days} kun VIP</b>`,
                { parse_mode: 'HTML', ...Markup.removeKeyboard() }
            );
        } catch (error) {
            if (error.code === 11000) {
                await ctx.reply('⚠️ Bu kod allaqachon mavjud!', Markup.removeKeyboard());
            } else {
                logger.error('promo create:', error);
                await ctx.reply('❌ Xatolik yuz berdi.', Markup.removeKeyboard());
            }
        }
        return ctx.scene.leave();
    }
);

promoWizard.hears(CANCEL, leaveCancelled);

export default promoWizard;
