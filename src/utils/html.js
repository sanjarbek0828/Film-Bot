/**
 * Telegram HTML parse_mode uchun xavfsiz matn yordamchilari.
 *
 * Foydalanuvchi kiritgan matn (kino nomi, sharh, ism) to'g'ridan-to'g'ri
 * HTML caption ichiga qo'yilsa, `<` yoki `&` belgisi butun xabarni buzadi
 * (Telegram "can't parse entities" xatosi qaytaradi).
 */

export const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

/** Telegram xabar limiti: 4096 belgi, caption: 1024 belgi */
export const TELEGRAM_LIMITS = { MESSAGE: 4096, CAPTION: 1024, CALLBACK_DATA: 64 };

/** Matnni limitga sig'diradi (HTML teglarini buzmaslik uchun xavfsiz chegara) */
export const truncate = (text, max = TELEGRAM_LIMITS.MESSAGE) => {
    const str = String(text ?? '');
    if (str.length <= max) return str;
    return `${str.slice(0, max - 3)}...`;
};

/** Uzun matnni Telegram limitiga mos bo'laklarga bo'ladi (qatorlarni buzmasdan) */
export const chunkMessage = (text, max = TELEGRAM_LIMITS.MESSAGE) => {
    const str = String(text ?? '');
    if (str.length <= max) return [str];

    const chunks = [];
    let current = '';

    for (const line of str.split('\n')) {
        if (current.length + line.length + 1 > max) {
            if (current) chunks.push(current);
            current = line.length > max ? line.slice(0, max) : line;
        } else {
            current = current ? `${current}\n${line}` : line;
        }
    }
    if (current) chunks.push(current);
    return chunks;
};

/** Kino nomini ko'rsatish uchun tayyorlaydi (placeholder nomlarni tozalaydi) */
export const movieTitle = (movie) => {
    if (!movie) return 'Kino';
    const title = movie.title?.trim();
    if (!title || /^Kino #\d+$/i.test(title)) return `Kino #${movie.code}`;
    return title;
};

export default { escapeHtml, truncate, chunkMessage, movieTitle, TELEGRAM_LIMITS };
