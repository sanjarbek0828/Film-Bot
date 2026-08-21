import User from '../models/User.js';
import logger from '../utils/logger.js';
import { invalidateUserCache } from './userService.js';

/**
 * VIP muddati tugashini kuzatuvchi scheduler.
 *
 * Muhim tuzatishlar:
 *  - Avval har DAQIQADA ishlab, 2 daqiqalik "oyna" ichidagilarni topardi:
 *    server 3 daqiqa uxlab qolsa yoki restart bo'lsa, xabarlar YO'QOLARDI.
 *    Endi 5 daqiqalik interval + `vipNotified` flagi orqali oyna cheklovi yo'q.
 *  - `setInterval` referensi saqlanadi (graceful shutdown uchun).
 *  - Xabar yuborish parallel va rate-limitga chidamli.
 *  - Bir tsiklda maksimal 200 ta xabar — DB va Telegram ni bosmaydi.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const BATCH_SIZE = 200;

let timer = null;
let botRef = null;
let running = false;

const EXPIRY_MESSAGE =
    '⏰ <b>VIP obunangiz tugadi!</b>\n\n' +
    'Sizning VIP statusingiz yakunlandi.\n\n' +
    '💎 Imtiyozlardan foydalanishni davom ettirish uchun obunani yangilang:\n' +
    '├ 🎬 Kinolarni cheklovsiz yuklab olish\n' +
    '├ 💬 Sharh qoldirish va o\'qish\n' +
    '├ ⭐ Sevimlilar ro\'yxati\n' +
    '└ 📜 Ko\'rish tarixi';

const checkExpiredVips = async () => {
    if (running || !botRef) return;
    running = true;

    try {
        const now = new Date();

        // Muddati tugagan va hali xabar berilmagan foydalanuvchilar
        const expired = await User.find({
            vipUntil: { $ne: null, $lte: now },
            vipNotified: { $ne: true },
        })
            .select('telegramId')
            .limit(BATCH_SIZE)
            .lean();

        if (expired.length > 0) {
            // Avval flagni belgilaymiz — xabar yuborish uzilib qolsa ham takroriy spam bo'lmaydi
            const ids = expired.map((user) => user.telegramId);
            await User.updateMany({ telegramId: { $in: ids } }, { $set: { vipNotified: true } });
            ids.forEach(invalidateUserCache);

            let notified = 0;
            for (const telegramId of ids) {
                try {
                    await botRef.telegram.sendMessage(telegramId, EXPIRY_MESSAGE, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[{ text: '💎 VIP Olish', callback_data: 'vip_info' }]],
                        },
                    });
                    notified += 1;
                } catch {
                    // Foydalanuvchi botni bloklagan — muammo emas
                }
                await new Promise((resolve) => setTimeout(resolve, 40));
            }

            logger.info(`VIP tugashi: ${ids.length} ta foydalanuvchi, ${notified} tasiga xabar yetdi`);
        }

        // Obunani yangilaganlarning flagini qaytaramiz
        const renewed = await User.updateMany(
            { vipUntil: { $gt: now }, vipNotified: true },
            { $set: { vipNotified: false } }
        );
        if (renewed.modifiedCount > 0) {
            logger.debug(`VIP flag tiklandi: ${renewed.modifiedCount} ta`);
        }
    } catch (error) {
        logger.error('VIP scheduler:', error);
    } finally {
        running = false;
    }
};

export const initVipScheduler = (bot) => {
    botRef = bot;
    if (timer) clearInterval(timer);

    // Ishga tushgandan 15 sekund keyin boshlanadi (DB ulanishi va webhook uchun vaqt)
    setTimeout(checkExpiredVips, 15_000);
    timer = setInterval(checkExpiredVips, CHECK_INTERVAL_MS);
    if (timer.unref) timer.unref(); // Process yopilishini bloklamaydi

    logger.success('VIP scheduler ishga tushdi (har 5 daqiqada)');
};

export const stopVipScheduler = () => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
};

export default initVipScheduler;
