import express from 'express';
import compression from 'compression';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

import config, { assertConfig } from './src/config/env.js';
import connectDB, { disconnectDB, isDbConnected } from './src/config/db.js';
import logger from './src/utils/logger.js';
import bot from './src/bot/bot.js';
import { getMoviesPage, getGenres, getMovieByCode } from './src/services/movieService.js';
import { sendMovieDirect } from './src/bot/sendMovie.js';
import { verifyInitData } from './src/utils/telegramAuth.js';
import User from './src/models/User.js';
import Favorite from './src/models/Favorite.js';
import { stopVipScheduler } from './src/services/vipScheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Kirish nuqtasi (entrypoint).
 *
 * TUZATILGAN BUGLAR / YAXSHILANISHLAR:
 *  - Konfiguratsiya ishga tushishdan oldin validatsiya qilinadi (BOT_TOKEN/
 *    MONGODB_URI/ADMIN_ID yo'q bo'lsa aniq xato bilan to'xtaydi, jimgina emas).
 *  - `/api/favorites/*` endi Telegram `initData` imzosi bilan HIMOYALANGAN
 *    (avval har kim istalgan foydalanuvchining sevimlilarini o'qishi/
 *    o'zgartirishi mumkin edi — jiddiy xavfsizlik teshigi).
 *  - `gzip` (compression) — katalog JSON javobi ancha kichrayadi (tezroq WebApp).
 *  - `/api/movies` sahifalangan (avval BUTUN kolleksiya bir marta yuborilardi).
 *  - Rasm proxy: SSRF himoyasi + timeout + faqat Telegram file_id.
 *  - Graceful shutdown (SIGTERM/SIGINT da webhook/DB toza yopiladi).
 *  - Webhook `dropPendingUpdates` bilan (restartdan keyin eski yangilanishlar
 *    to'planib bosib ketmaydi).
 */

const app = express();
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

app.use(compression());
app.use(express.json({ limit: '256kb' }));

// CORS — Telegram WebApp turli originlardan keladi
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, X-Telegram-Init-Data');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ═══════════════════════ Sog'liq (health) ═══════════════════════
app.get('/', (req, res) => res.send('🎥 FilmXBot ishlamoqda...'));
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        db: isDbConnected() ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// ═══════════════════════ WebApp statik fayllari ═══════════════════════
app.use(
    '/webapp',
    express.static(PUBLIC_DIR, {
        maxAge: '7d',
        index: 'index.html',
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            } else if (/\.(js|css|woff2?|png|jpe?g|svg|webp)$/.test(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
            }
        },
    })
);

// ═══════════════════════ API ═══════════════════════

// Kinolar katalogi (sahifalangan)
app.get('/api/movies', async (req, res) => {
    try {
        const result = await getMoviesPage({
            page: req.query.page,
            limit: req.query.limit,
            genre: req.query.genre,
            search: req.query.search,
            sort: req.query.sort,
        });
        res.set('Cache-Control', 'public, max-age=60');
        res.json(result);
    } catch (error) {
        logger.error('GET /api/movies:', error);
        res.status(500).json({ error: 'server_error' });
    }
});

// Janrlar ro'yxati
app.get('/api/genres', async (req, res) => {
    try {
        const genres = await getGenres();
        res.set('Cache-Control', 'public, max-age=300');
        res.json(genres);
    } catch (error) {
        res.status(500).json({ error: 'server_error' });
    }
});

// Telegram file proxy (rasm/poster). SSRF himoyasi bilan.
app.get('/api/image/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;

        // To'liq URL bo'lsa — faqat HTTPS ga yo'naltiramiz
        if (/^https?:\/\//i.test(fileId)) {
            if (!/^https:\/\//i.test(fileId)) return res.status(400).send('Only HTTPS allowed');
            return res.redirect(fileId);
        }

        // Telegram file_id formatini tekshiramiz
        if (!/^[\w-]+$/.test(fileId)) return res.status(400).send('Invalid file id');

        const link = await bot.telegram.getFileLink(fileId);
        const request = https.get(link.href, { timeout: 15_000 }, (upstream) => {
            if (upstream.statusCode !== 200) {
                res.status(502).end();
                upstream.resume();
                return;
            }
            res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=1209600, immutable'); // 14 kun
            upstream.pipe(res);
        });
        request.on('timeout', () => request.destroy());
        request.on('error', () => {
            if (!res.headersSent) res.status(502).end();
        });
    } catch (error) {
        res.status(404).send('Image not found');
    }
});

// ═══ Sevimlilar (HIMOYALANGAN: Telegram initData imzosi talab qilinadi) ═══
const authenticateWebApp = (req, res, next) => {
    const initData = req.get('X-Telegram-Init-Data') || req.body?.initData;
    const result = verifyInitData(initData);
    if (!result.ok) return res.status(401).json({ error: 'unauthorized', reason: result.reason });
    req.telegramUser = result.user;
    next();
};

app.get('/api/favorites', authenticateWebApp, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.telegramUser.id }).select('_id').lean();
        if (!user) return res.json([]);
        const favorites = await Favorite.find({ user: user._id })
            .populate('movie', 'code title poster genre year views')
            .lean();
        res.json(favorites.map((f) => f.movie).filter(Boolean));
    } catch (error) {
        logger.error('GET /api/favorites:', error);
        res.status(500).json({ error: 'server_error' });
    }
});

app.post('/api/favorites/toggle', authenticateWebApp, async (req, res) => {
    try {
        const { movieId } = req.body;
        if (!movieId) return res.status(400).json({ error: 'missing_movie_id' });

        const user = await User.findOne({ telegramId: req.telegramUser.id }).select('_id').lean();
        if (!user) return res.status(404).json({ error: 'user_not_found' });

        const existing = await Favorite.findOne({ user: user._id, movie: movieId });
        if (existing) {
            await Favorite.deleteOne({ _id: existing._id });
            return res.json({ status: 'removed' });
        }
        await Favorite.create({ user: user._id, movie: movieId });
        res.json({ status: 'added' });
    } catch (error) {
        if (error.code === 11000) return res.json({ status: 'added' });
        logger.error('POST /api/favorites/toggle:', error);
        res.status(500).json({ error: 'server_error' });
    }
});

// Bot ma'lumotlari (username va qo'llab-quvvatlash havolasi)
app.get('/api/bot-info', (req, res) => {
    res.json({
        username: bot.botInfo?.username || null,
        supportUsername: config.supportUsername || null,
        webAppUrl: config.webAppUrl || null,
    });
});

// WebApp orqali kinoni to'g'ridan-to'g'ri foydalanuvchining bot chatiga yuborish
app.post('/api/movies/play', authenticateWebApp, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'missing_code' });

        const movie = await getMovieByCode(Number(code));
        if (!movie) return res.status(404).json({ error: 'movie_not_found' });

        const user = await User.findOne({ telegramId: req.telegramUser.id }).lean();
        const delivered = await sendMovieDirect(bot.telegram, req.telegramUser.id, movie, user, {
            botUsername: bot.botInfo?.username,
        });

        if (delivered) {
            return res.json({ success: true, code: movie.code, title: movie.title });
        } else {
            return res.status(500).json({ error: 'delivery_failed' });
        }
    } catch (error) {
        logger.error('POST /api/movies/play:', error);
        res.status(500).json({ error: 'server_error' });
    }
});

// SPA fallback — WebApp routing (Express v5)
app.get(['/webapp', '/webapp/*splat'], (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ═══════════════════════ Ishga tushirish ═══════════════════════
let server = null;

const start = async () => {
    assertConfig();

    try {
        await connectDB();
    } catch (error) {
        logger.error('Ma\'lumotlar bazasiga ulanib bo\'lmadi:', error.message);
        logger.warn('Bot ishga tushadi, lekin DB funksiyalari ishlamasligi mumkin.');
    }

    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Bosh menyu (qayta ishga tushirish)' },
            { command: 'help', description: 'Yordam' },
            { command: 'support', description: 'Admin bilan bog\'lanish' },
        ]);

        if (config.webAppUrl) {
            await bot.telegram.setChatMenuButton({
                menu_button: {
                    type: 'web_app',
                    text: '🎬 Katalog',
                    web_app: { url: config.webAppUrl },
                },
            }).catch((err) => logger.debug('setChatMenuButton skip:', err.message));
        }
    } catch (error) {
        logger.warn('Buyruqlar menyusini o\'rnatib bo\'lmadi:', error.message);
    }

    if (config.publicUrl) {
        // ═══ WEBHOOK rejimi (production) ═══
        const secretPath = `/telegraf/${bot.secretPathComponent()}`;
        app.use(await bot.createWebhook({ domain: config.publicUrl, path: secretPath, drop_pending_updates: config.dropPendingUpdates }));

        server = app.listen(config.port, () => {
            logger.success(`Server (Webhook) ${config.port}-portda ishlamoqda`);
            logger.info(`WebApp: ${config.webAppUrl}`);
        });
    } else {
        // ═══ POLLING rejimi (mahalliy ishlab chiqish) ═══
        server = app.listen(config.port, () => {
            logger.success(`Server (Polling) ${config.port}-portda ishlamoqda`);
        });
        await bot.launch({ dropPendingUpdates: config.dropPendingUpdates });
        logger.success('Bot ishga tushdi (Long Polling)');
    }
};

// ═══════════════════════ Graceful shutdown ═══════════════════════
let shuttingDown = false;
const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} qabul qilindi — to'xtatilmoqda...`);

    stopVipScheduler();
    try { bot.stop(signal); } catch { /* noop */ }
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB().catch(() => {});

    logger.info('Toza yopildi.');
    process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (error) => logger.error('Uncaught Exception:', error));

start().catch((error) => {
    logger.error('Ishga tushirish muvaffaqiyatsiz:', error);
    process.exit(1);
});
