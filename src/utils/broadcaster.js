import logger from './logger.js';

/**
 * Ommaviy xabar yuborish uchun ishonchli yuboruvchi.
 *
 * Eski kod har bir foydalanuvchini ketma-ket (sequential) 40ms tanaffus bilan
 * yuborardi: 10 000 foydalanuvchi = ~7 daqiqa va 429 xatosini umuman
 * hisobga olmasdi. Bu versiya:
 *   - Cheklangan parallellik (concurrency) bilan ~25 xabar/sekund tezlikda ishlaydi
 *   - `429 Too Many Requests` da `retry_after` ni hurmat qilib qayta uradi
 *   - Botni bloklagan / o'chirilgan akkauntlarni aniqlaydi (keyin tozalash uchun)
 *   - Progressni throttle bilan xabar qiladi (Telegram editMessageText limitiga tushmaydi)
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Foydalanuvchi bot bilan aloqani butunlay uzganini aniqlaydi */
const isPermanentFailure = (error) => {
    const code = error?.response?.error_code ?? error?.code;
    const description = (error?.response?.description || error?.message || '').toLowerCase();
    if (code === 403) return true; // bot bloklangan / kicked
    if (code === 400 && /chat not found|user is deactivated|peer_id_invalid/.test(description)) return true;
    return false;
};

const getRetryAfter = (error) => {
    const code = error?.response?.error_code ?? error?.code;
    if (code !== 429) return null;
    const retryAfter = error?.response?.parameters?.retry_after ?? error?.parameters?.retry_after;
    return Math.max(1, Number(retryAfter) || 1);
};

/**
 * @param {object} options
 * @param {Array<number|string>} options.recipients  Telegram ID lar ro'yxati
 * @param {(chatId: number|string) => Promise<any>} options.send  Bitta yuborish funksiyasi
 * @param {number} [options.concurrency=8]  Parallel yuborishlar soni
 * @param {number} [options.perMessageDelay=35]  Har bir yuborish orasidagi minimal tanaffus (ms)
 * @param {(progress: {sent:number,failed:number,blocked:number,total:number}) => void} [options.onProgress]
 * @param {number} [options.progressIntervalMs=4000]
 * @param {() => boolean} [options.isCancelled]  Bekor qilishni tekshiruvchi
 */
export const broadcast = async ({
    recipients,
    send,
    concurrency = 8,
    perMessageDelay = 35,
    onProgress,
    progressIntervalMs = 4000,
    isCancelled,
}) => {
    const total = recipients.length;
    const result = { sent: 0, failed: 0, blocked: 0, total, blockedIds: [], cancelled: false };

    if (total === 0) return result;

    let cursor = 0;
    let lastProgressAt = Date.now();

    const reportProgress = (force = false) => {
        if (!onProgress) return;
        const now = Date.now();
        if (!force && now - lastProgressAt < progressIntervalMs) return;
        lastProgressAt = now;
        try {
            onProgress({ sent: result.sent, failed: result.failed, blocked: result.blocked, total });
        } catch { /* progress xatosi asosiy jarayonni to'xtatmasligi kerak */ }
    };

    const deliver = async (chatId) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await send(chatId);
                result.sent += 1;
                return;
            } catch (error) {
                const retryAfter = getRetryAfter(error);
                if (retryAfter !== null) {
                    await sleep(retryAfter * 1000 + 250);
                    continue;
                }
                if (isPermanentFailure(error)) {
                    result.blocked += 1;
                    result.blockedIds.push(chatId);
                    return;
                }
                if (attempt === 2) {
                    result.failed += 1;
                    logger.debug(`Broadcast delivery failed for ${chatId}:`, error?.message);
                    return;
                }
                await sleep(500 * (attempt + 1));
            }
        }
    };

    const worker = async () => {
        while (cursor < total) {
            if (isCancelled?.()) {
                result.cancelled = true;
                return;
            }
            const chatId = recipients[cursor];
            cursor += 1;
            await deliver(chatId);
            reportProgress();
            if (perMessageDelay > 0) await sleep(perMessageDelay);
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
    reportProgress(true);

    return result;
};

export default broadcast;
