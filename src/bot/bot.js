import { Telegraf, Scenes, session } from 'telegraf';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { authMiddleware } from './middleware.js';

// Scenes
import addMovieScene from '../scenes/addMovieScene.js';
import bulkAddMovieScene from '../scenes/bulkAddMovieScene.js';
import broadcastScene from '../scenes/broadcastScene.js';
import vipScene from '../scenes/vipScene.js';
import reviewScene from '../scenes/reviewScene.js';
import requestScene from '../scenes/requestScene.js';
import reportScene from '../scenes/reportScene.js';
import promoWizard from '../scenes/promoScene.js';
import redeemScene from '../scenes/promoRedeemScene.js';
import editMovieScene from '../scenes/editMovieScene.js';
import autoPostSettingsScene from '../scenes/autoPostSettingsScene.js';
import mandatorySubscriptionScene from '../scenes/mandatorySubscriptionScene.js';
import userProfileScene from '../scenes/userProfileScene.js';
import globalVipScene from '../scenes/globalVipScene.js';
import directMessageScene from '../scenes/directMessageScene.js';
import startGifScene from '../scenes/startGifScene.js';
import addFavCodeScene from '../scenes/addFavCodeScene.js';
import paymentReceiptScene from '../scenes/paymentReceiptScene.js';
import bulkEditMovieScene from '../scenes/bulkEditMovieScene.js';

// Command setups
import { setupAdminCommands } from '../commands/admin.js';
import { setupStartCommand } from '../commands/start.js';
import { setupUserCommands } from '../commands/user.js';
import { setupCategoryCommands, setupInlineSearch } from '../commands/category.js';
import { initVipScheduler } from '../services/vipScheduler.js';

const bot = new Telegraf(config.botToken, {
    handlerTimeout: 90_000, // Uzoq broadcastlar uchun (default 90s, aniq belgilaymiz)
});

const stage = new Scenes.Stage([
    addMovieScene,
    bulkAddMovieScene,
    broadcastScene,
    vipScene,
    reviewScene,
    requestScene,
    reportScene,
    promoWizard,
    redeemScene,
    editMovieScene,
    autoPostSettingsScene,
    mandatorySubscriptionScene,
    userProfileScene,
    globalVipScene,
    directMessageScene,
    startGifScene,
    addFavCodeScene,
    paymentReceiptScene,
    bulkEditMovieScene,
]);

// Global /cancel — istalgan scene'dan chiqish
stage.command('cancel', async (ctx) => {
    await ctx.scene.leave().catch(() => {});
    await ctx.reply('❌ Bekor qilindi.').catch(() => {});
});

bot.use(session());
bot.use(authMiddleware);
bot.use(stage.middleware());

// Buyruqlarni ulash. Matn handleri (user.js) ohirida bo'lishi shart!
setupStartCommand(bot);
setupAdminCommands(bot);
setupCategoryCommands(bot);
setupInlineSearch(bot);
setupUserCommands(bot);

initVipScheduler(bot);

// Global xato ushlagich — bu yerda `ctx.reply` chaqirmaymiz
// (bloklangan chatlarda yana xato bo'lib, cheksiz loop kelib chiqmasligi uchun)
bot.catch((error, ctx) => {
    logger.error(`Bot xatosi (${ctx?.updateType}):`, error);
});

export default bot;
