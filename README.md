# 🎥 FilmXBot — Telegram Kino Bot + WebApp

O'zbek tilidagi to'liq funksiyali Telegram kino boti. Telegraf 4, MongoDB (Mongoose) va React + Vite asosidagi Telegram Mini App katalogi bilan.

## 🚀 Xususiyatlar

### Foydalanuvchi uchun
- 🔍 Kino qidirish (nomi yoki kodi orqali, matnli indeks bilan tez)
- 📂 Kategoriyalar (janrlar bo'yicha, sahifalash bilan)
- 🆕 Yangi va 🔥 Top kinolar
- 🎲 Tasodifiy kino va ✨ AI tavsiyalar (ko'rish tarixi asosida)
- ❤️ Sevimlilar va 📜 ko'rish tarixi (server bilan sinxron)
- 💎 VIP obuna (Telegram Stars orqali to'lov)
- 🎫 Promokodlar, 🎁 kunlik bonus, 🗣 referal tizimi
- 🌐 Telegram Mini App katalog (Netflix uslubidagi UI)

### Admin uchun
- ➕ Bitta yoki 📚 ommaviy kino qo'shish (iTunes API orqali avto-metama'lumot)
- ✏️ Kino tahrirlash va 📚 ommaviy tahrirlash (seriallar)
- 📢 Reklama tarqatish (rate-limitga chidamli, VIP filtri bilan)
- 🌐 Barchaga VIP berish (aksiya)
- 💎 VIP boshqaruv, 🚫 ban/unban
- 📊 Statistika va 📈 kengaytirilgan tahlil
- 📢 Majburiy obuna sozlamalari, 📡 avto-post
- 💾 Baza zaxirasi (JSON export), 🗂 admin loglar

## 📦 O'rnatish

```bash
git clone <repo-url>
cd Film-Bot
npm install
cp .env.example .env   # va qiymatlarni to'ldiring
npm run build          # WebApp'ni yig'ish
npm start
```

### `.env` sozlamalari
Majburiy: `BOT_TOKEN`, `MONGODB_URI`, `ADMIN_ID`.
Batafsil izohlar `.env.example` faylida.

- **Webhook rejimi:** `PUBLIC_URL` (yoki Render'da `RENDER_EXTERNAL_URL`) o'rnatilgan bo'lsa avtomatik yoqiladi.
- **Polling rejimi:** `PUBLIC_URL` bo'sh bo'lsa (mahalliy test uchun).

## 🏗 Arxitektura

```
Film-Bot/
├── index.js                  # Express server + webhook/polling + WebApp API
├── src/
│   ├── config/
│   │   ├── env.js            # Markazlashgan, validatsiyalangan konfiguratsiya
│   │   └── db.js             # MongoDB ulanish (compression, auto-reconnect)
│   ├── bot/
│   │   ├── bot.js            # Telegraf sozlamasi + scene'lar
│   │   ├── middleware.js     # Auth + anti-spam + obuna
│   │   └── sendMovie.js      # Kino yuborish (HTML-xavfsiz)
│   ├── commands/             # start, user, admin, category
│   ├── scenes/               # Wizard/BaseScene'lar (kino qo'shish, VIP, promo...)
│   ├── models/               # Mongoose modellari (indekslar bilan)
│   ├── services/             # movie, user, subscription, config, recommendation, vipScheduler
│   └── utils/                # cache, logger, broadcaster, telegramAuth, html, locales, menuUtils
└── webapp/                   # React + Vite Telegram Mini App
```

## 🔐 Xavfsizlik

- WebApp API (`/api/favorites`) Telegram `initData` HMAC imzosi bilan himoyalangan.
- Admin huquqi faqat `ADMIN_ID` yoki DB roli bo'yicha, real vaqtda tekshiriladi.
- Barcha foydalanuvchi matnlari HTML-escape qilinadi (parse xatolari yo'q).
- Loglarda bot tokeni va DB parollari avtomatik yashiriladi.
- Rasm proxy SSRF va timeout himoyasi bilan.

## ⚡ Ishlash (performance)

- MongoDB indekslari barcha asosiy so'rovlar uchun.
- Markazlashgan kesh (cache-aside + in-flight deduplication).
- Katalog javobi sahifalangan va gzip bilan siqilgan.
- Broadcast cheklangan parallellik + `retry_after` bilan (10k+ foydalanuvchi uchun).
- WebApp vendor chunk'larga bo'lingan (React/Motion/Icons alohida keshlanadi).

## 🌐 Deploy (Render.com)

`render.yaml` mavjud. Environment variables: `BOT_TOKEN`, `MONGODB_URI`, `ADMIN_ID`.
Build: `npm install && npm run build`, Start: `npm start`.
Uptime uchun `/health` endpointini ping qiling.

## 📝 Litsenziya

ISC
