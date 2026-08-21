import config from '../config/env.js';

/**
 * Yengil, darajali (leveled) va xavfsiz logger.
 *
 * Eski versiya har bir log uchun butun obyektni rekursiv nusxalab, "id" kabi
 * juda keng kalitlarni ham yashirar edi — bu ham sekin, ham debug qilishni
 * imkonsiz qilardi. Bu versiya faqat haqiqiy maxfiy ma'lumotni yashiradi.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = LEVELS[config.logLevel] ?? LEVELS.info;

const SECRET_KEYS = new Set([
    'token', 'bot_token', 'bottoken',
    'password', 'pass', 'passwd',
    'secret', 'apikey', 'api_key', 'accesstoken', 'access_token',
    'refreshtoken', 'refresh_token', 'authorization', 'auth',
    'cookie', 'session', 'privatekey', 'private_key',
    'mongodb_uri', 'mongouri', 'connection_string', 'dsn',
]);

// Bot tokeni va Mongo parolini matn ichidan topib yashiradi
const INLINE_SECRETS = [
    [/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g, '[BOT_TOKEN]'],
    [/(mongodb(?:\+srv)?:\/\/)[^:/@\s]+:[^@\s]+@/gi, '$1[CREDENTIALS]@'],
    [/(Bearer\s+)[A-Za-z0-9._-]{10,}/gi, '$1[REDACTED]'],
];

const redactString = (str) => {
    let out = str;
    for (const [pattern, replacement] of INLINE_SECRETS) out = out.replace(pattern, replacement);
    return out;
};

const redact = (input, depth = 0, seen = new WeakSet()) => {
    if (input == null) return input;
    if (typeof input === 'string') return redactString(input);
    if (typeof input !== 'object') return input;
    if (depth > 4) return '[Object]';

    if (input instanceof Error) {
        return `${input.name}: ${redactString(input.message)}${input.stack ? `\n${redactString(input.stack)}` : ''}`;
    }
    if (seen.has(input)) return '[Circular]';
    seen.add(input);

    if (Array.isArray(input)) {
        return input.slice(0, 50).map((item) => redact(item, depth + 1, seen));
    }

    const out = {};
    for (const [key, value] of Object.entries(input)) {
        out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(value, depth + 1, seen);
    }
    return out;
};

const timestamp = () => new Date().toISOString().slice(11, 23);

const emit = (level, icon, consoleFn, args) => {
    if (LEVELS[level] > activeLevel) return;
    consoleFn(`${icon} ${timestamp()}`, ...args.map((arg) => redact(arg)));
};

const logger = {
    error: (...args) => emit('error', '❌', console.error, args),
    warn: (...args) => emit('warn', '⚠️ ', console.warn, args),
    info: (...args) => emit('info', 'ℹ️ ', console.log, args),
    debug: (...args) => emit('debug', '🔍', console.log, args),
    success: (...args) => emit('info', '✅', console.log, args),
    log: (...args) => emit('info', 'ℹ️ ', console.log, args),
};

export default logger;
