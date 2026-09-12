import { Scenes, Markup } from 'telegraf';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { getPrimaryAdminId } from '../utils/adminHelper.js';
import { escapeHtml } from '../utils/html.js';

const requestScene = new Scenes.WizardScene(
    'REQUEST_SCENE',
    // Step 1: Ask for movie name
    async (ctx) => {
        try {
            await ctx.reply(ctx.t('request_prompt'), {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback(ctx.t('cancel'), 'cancel_request')]])
            });
            return ctx.wizard.next();
        } catch (e) {
            logger.error('Request Step 1 error:', e);
            return ctx.scene.leave();
        }
    },
    // Step 2: Handle Input and Send to Admin
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_request') {
                await ctx.answerCbQuery(ctx.t('cancel'));
                await ctx.editMessageText(ctx.t('cancel'));
                return ctx.scene.leave();
            }

            if (!ctx.message || !ctx.message.text) {
                return ctx.reply(ctx.t('review_text_error'), { parse_mode: 'HTML' });
            }

            const movieName = ctx.message.text;
            const user = ctx.from;
            const name = user.first_name || user.username || 'User';

            // Send to Admin
            const adminId = getPrimaryAdminId();
            if (adminId) {
                const adminMsg = ctx.t('request_admin_notify', { name: escapeHtml(name), id: user.id, movie: escapeHtml(movieName) });
                await ctx.telegram.sendMessage(adminId, adminMsg, { parse_mode: 'HTML' }).catch(() => {});
            }

            await ctx.reply(ctx.t('request_success'), { parse_mode: 'HTML' });
            return ctx.scene.leave();
        } catch (e) {
            logger.error('Request Step 2 error:', e);
            ctx.reply(ctx.t('error_general'), { parse_mode: 'HTML' }).catch(() => {});
            return ctx.scene.leave();
        }
    }
);

requestScene.command('cancel', async (ctx) => {
    await ctx.reply(ctx.t('cancel'));
    return ctx.scene.leave();
});

export default requestScene;
