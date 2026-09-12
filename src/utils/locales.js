/**
 * Ko'p tilli matnlar (i18n).
 * O'zbekcha, Ruscha va Inglizcha zamonaviy Telegram HTML formatida.
 */

const uz = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Assalomu alaykum, {name}!</b>\n\n🍿 <b>FilmX</b> — eng sara kinolar, premyeralar va seriallar olamiga xush kelibsiz!\n\n🔍 <b>Kino topish juda oson:</b>\n├ 🔢 Kino <b>kodini</b> yuboring (masalan: <code>1025</code>)\n└ 📝 Yoki kino <b>nomini</b> yozing (masalan: <i>Venom</i>)\n\n🌐 Pastdagi <b>«🎬 Katalog»</b> orqali qulay vizual katalogdan foydalanishingiz mumkin!",

    menu_main: "🏠 Bosh menyu",
    menu_cabinet: "👤 Shaxsiy kabinet",
    menu_search: "🔍 Qidirish",
    menu_category: "📂 Kategoriyalar",
    menu_random: "🎲 Tasodifiy film",
    menu_new: "🆕 Yangi kinolar",
    menu_fav: "❤️ Sevimlilar",
    menu_top: "🔥 Top kinolar",
    menu_stats: "📊 Mening statistikam",
    menu_vip: "💎 VIP obuna",
    menu_settings: "⚙️ Sozlamalar",
    menu_vote: "🗳 Kino so'rash",
    menu_vip_status: "⏳ VIP vaqti",
    menu_history: "📜 Ko'rishlar tarixi",
    menu_shop: "🛍 Ballar do'koni",
    menu_bonus: "🎁 Kunlik bonus",
    menu_invite: "🗣 Do'stlarni taklif qilish",
    menu_catalog: "🎬 Kinolar katalogi",
    menu_recommend: "✨ Menga tavsiya qil",

    vip_time_remaining: "⏳ <b>VIP obunangiz holati:</b>\n\n📅 Qolgan muddat: <b>{days} kun, {hours} soat, {minutes} daqiqa</b>.",
    vip_expired: "⚠️ <b>VIP obunangiz muddati tugagan.</b>\nImtiyozlardan foydalanish uchun uni qayta faollashtiring.",
    vip_active_badge: "💎 <b>VIP maqomi:</b> Faol (⭐️ {days} kun qoldi)",

    bonus_claimed: "🎁 <b>Tabriklaymiz!</b>\n\nHisobingizga <b>+25 ball</b> qo'shildi!\n💰 Jami ballaringiz: <b>{points}</b> ball.",
    bonus_cooldown: "⏳ <b>Bugungi bonusni olib bo'lgansiz!</b>\n\nKeyingi bonus <b>{hours} soat {minutes} daqiqa</b>dan so'ng beriladi.",

    referral_promo: "🗣 <b>Do'stlaringizni taklif qiling va bepul VIP oling!</b>\n\nHar 10 ta do'stingiz botga qo'shilganda sizga <b>24 soatlik VIP</b> sovg'a qilinadi!\n\n🔗 <b>Sizning shaxsiy taklif havolangiz:</b>\n<code>{link}</code>",
    referral_progress: "👤 <b>Yangi do'stingiz qo'shildi!</b> (Jami: {count} ta)\n🎉 VIP obunani qo'lga kiritish uchun yana <b>{left} ta</b> do'st kerak.",
    referral_milestone: "🎉 <b>TABRIKLAYMIZ!</b>\n\nSiz 10 ta do'stingizni taklif qildingiz va <b>24 soatlik VIP obuna</b>ga ega bo'ldingiz!",

    shop_welcome: "🛍 <b>Ballar do'koni</b>\n\n💰 Sizning balansingiz: <b>{points} ball</b>\n\n💎 <b>7 kunlik VIP obuna</b> — 5 000 ball\n\n<i>Har kuni bonus olib ballaringizni ko'paytiring!</i>",
    shop_success: "✅ <b>Xarid muvaffaqiyatli amalga oshirildi!</b>\n\nSizga 7 kunlik VIP obuna berildi!",
    shop_fail: "❌ <b>Ballaringiz yetarli emas!</b>\n\nKunlik bonus olib yoki do'stlarni taklif qilib ball to'plang.",

    vip_restricted: "🔒 <b>Ushbu imkoniyat faqat VIP foydalanuvchilar uchun!</b>\n\n💎 VIP obunaga ega bo'lib, filmlarni to'g'ridan-to'g'ri yuklab oling va cheklovlarsiz tomosha qiling.",
    vip_restricted_fav: "🔒 <b>Sevimlilar ro'yxati faqat VIP foydalanuvchilar uchun!</b>",
    vip_restricted_review: "🔒 <b>Sharh qoldirish faqat VIP foydalanuvchilar uchun!</b>",
    vip_restricted_report: "🔒 <b>Shikoyat qilish faqat VIP foydalanuvchilar uchun!</b>",
    vip_promo_start: "💎 <b>VIP obuna imtiyozlari:</b>\n\n✅ Kinolarni to'g'ridan-to'g'ri <b>yuklab olish</b>\n✅ Kinolarga <b>sharh</b> va baho qoldirish\n✅ <b>Sevimlilar</b> va ko'rishlar tarixi\n✅ <b>Reklamalarsiz</b> va tezkor server",
    vip_button_get: "💎 VIP olish",
    vip_only_comment: "🔒 Faqat VIP a'zolar sharh qoldirishi mumkin!",

    search_prompt: "🔍 <b>Kino qidirish</b>\n\nIltimos, kino <b>nomini</b> yoki <b>kodini</b> yozib yuboring:\n\n<i>Masalan: «Titanik» yoki «1001»</i>",
    search_results: "🔎 <b>«{query}»</b> bo'yicha topilgan natijalar ({count} ta):",
    search_hint: "\n💡 <i>Kinoni tomosha qilish uchun uning kodini chatga yuboring.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Janr: {genre}\n⭐️ Reyting: {rating} | 👁 Ko'rishlar: {views}",

    review_rating_prompt: "⭐️ <b>Kinoga baho bering:</b>\n\n<i>1 dan 5 gacha yulduz tanlang:</i>",
    review_your_rating: "⭐️ Sizning bahoyingiz: <b>{rating}/5</b>\n\n✍️ Endi film haqida qisqa sharhingizni yozib yuboring:",
    review_success: "✅ <b>Sharhingiz muvaffaqiyatli saqlandi!</b>\n\n⭐️ Baho: {rating}/5\nFikringiz boshqa foydalanuvchilarga foydali bo'ladi. Rahmat!",
    review_cancel: "❌ Sharh qoldirish bekor qilindi.",
    review_text_error: "⚠️ Iltimos, sharh matnini yozib yuboring.",
    comment_prompt: "✍️ Kino haqida fikringizni yozing:",
    comment_saved: "✅ Sharhingiz saqlandi! Rahmat.",
    report_sent: "✅ Shikoyatingiz adminga yetkazildi. Rahmat!",

    error_general: "⚠️ <b>Kutilmagan xatolik yuz berdi.</b>\nIltimos, birozdan so'ng qayta urinib ko'ring.",
    not_found: "📭 <b>Afsuski, bunday kino topilmadi.</b>\n\nIltimos, nomni to'g'ri yozganingizni yoki kodni tekshiring.",
    cancel: "❌ Bekor qilish",
    loading: "⏳ Yuklanmoqda...",
    page_prev: "⬅️ Oldingi",
    page_next: "Keyingi ➡️",
    page_info: "(Sahifa {page})",

    vip_admin_title: "💎 <b>VIP foydalanuvchi qidirish</b>\n\nRo'yxatdan tanlang yoki ism/ID yuboring:",
    vip_search_result: "🔍 <b>Qidiruv natijalari:</b> '{query}'",
    vip_select_duration: "⏳ <b>{name}</b> (ID: {id}) uchun VIP muddatini tanlang:",
    vip_granted: "✅ <b>Muvaffaqiyatli!</b>\nFoydalanuvchi {id} ga VIP {date} gacha berildi.",
    vip_notify_user: "🎉 <b>Tabriklaymiz!</b>\n\nSizga {days} kunga VIP obuna berildi!\n📅 Amal qilish muddati: {date} gacha.",

    settings_title: "⚙️ <b>Sozlamalar bo'limi</b>\n\nO'zingizga qulay tilni tanlang:",
    lang_changed: "✅ Til muvaffaqiyatli o'zgartirildi: O'zbekcha 🇺🇿",

    sub_check_msg: "📢 <b>Botdan foydalanish uchun homiy kanallarimizga a'zo bo'ling:</b>\n\n<i>Quyidagi kanallarga a'zo bo'lgach, «✅ Tekshirish» tugmasini bosing:</i>",
    sub_btn_join: "➕ A'zo bo'lish",
    sub_btn_check: "✅ Tekshirish",
    sub_success: "✅ <b>Rahmat! Obuna tasdiqlandi.</b>\nEndi botdan bemalol foydalanishingiz mumkin.",
    sub_fail: "⚠️ <b>Siz hali barcha kanallarga a'zo bo'lmadingiz!</b>\n\nIltimos, barcha ko'rsatilgan kanallarga a'zo bo'lib, qayta urinib ko'ring.",

    admin_channel_menu: "📢 <b>Majburiy obuna sozlamalari</b>\n\nHolat: {status}",
    admin_channel_list: "📋 <b>Kanallar ro'yxati:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Kanal qo'shish</b>\n\nKanal linkini yoki IDsini yuboring.\n\n<i>Bot kanalga admin bo'lishi shart!</i>",
    admin_channel_added: "✅ Kanal muvaffaqiyatli qo'shildi!",
    admin_channel_deleted: "🗑 Kanal o'chirildi.",

    request_prompt: "🎬 <b>Kino buyurtma qilish</b>\n\nQaysi kinoni botga qo'shishimizni xohlaysiz? Aniq nomini yozing:",
    request_success: "✅ <b>So'rovingiz qabul qilindi!</b>\n\nAdminlarimiz tez orada ushbu filmni qo'shishadi. Rahmat!",
    request_admin_notify: "📬 <b>Yangi kino so'rovi!</b>\n\n👤 Foydalanuvchi: <b>{name}</b>\n🆔 ID: <code>{id}</code>\n🎬 Kino: <b>{movie}</b>",
};

const ru = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Привет, {name}!</b>\n\n🍿 Добро пожаловать в <b>FilmX</b> — мир лучших фильмов, новинок и сериалов!\n\n🔍 <b>Найти фильм очень просто:</b>\n├ 🔢 Отправьте <b>код</b> фильма (например: <code>1025</code>)\n└ 📝 Или напишите <b>название</b> (например: <i>Веном</i>)\n\n🌐 Нажмите <b>«🎬 Каталог»</b> внизу для удобного визуального поиска!",

    menu_main: "🏠 Главное меню",
    menu_cabinet: "👤 Личный кабинет",
    menu_search: "🔍 Поиск",
    menu_category: "📂 Категории",
    menu_random: "🎲 Случайный фильм",
    menu_new: "🆕 Новинки кино",
    menu_fav: "❤️ Избранное",
    menu_top: "🔥 Топ фильмы",
    menu_stats: "📊 Моя статистика",
    menu_vip: "💎 VIP подписка",
    menu_settings: "⚙️ Настройки",
    menu_vote: "🗳 Заказать фильм",
    menu_vip_status: "⏳ Время VIP",
    menu_history: "📜 История просмотров",
    menu_shop: "🛍 Магазин баллов",
    menu_bonus: "🎁 Ежедневный бонус",
    menu_invite: "🗣 Пригласить друзей",
    menu_catalog: "🎬 Каталог фильмов",
    menu_recommend: "✨ AI Рекомендация",

    vip_time_remaining: "⏳ <b>Статус вашей VIP подписки:</b>\n\n📅 Осталось: <b>{days} дн., {hours} ч., {minutes} мин.</b>",
    vip_expired: "⚠️ <b>Срок действия вашей VIP подписки истёк.</b>",
    vip_active_badge: "💎 <b>VIP статус:</b> Активен (⭐️ осталось {days} дн.)",

    bonus_claimed: "🎁 <b>Поздравляем!</b>\n\nВам начислено <b>+25 баллов</b>!\n💰 Всего: <b>{points}</b> баллов.",
    bonus_cooldown: "⏳ <b>Вы уже забрали сегодняшний бонус!</b>\n\nСледующий бонус через <b>{hours} ч. {minutes} мин.</b>",

    referral_promo: "🗣 <b>Приглашайте друзей и получайте бесплатный VIP!</b>\n\nЗа каждые 10 друзей вам начисляется <b>24 часа VIP</b>!\n\n🔗 <b>Ваша ссылка для приглашений:</b>\n<code>{link}</code>",
    referral_progress: "👤 <b>Друг присоединился!</b> (Всего: {count})\n🎉 До получения VIP осталось <b>{left}</b> друзей.",
    referral_milestone: "🎉 <b>ПОЗДРАВЛЯЕМ!</b>\n\nВы пригласили 10 друзей и получили <b>24 часа VIP подписки</b>!",

    shop_welcome: "🛍 <b>Магазин баллов</b>\n\n💰 Ваш баланс: <b>{points} баллов</b>\n\n💎 <b>VIP на 7 дней</b> — 5 000 баллов\n\n<i>Собирайте ежедневные бонусы, чтобы копить баллы!</i>",
    shop_success: "✅ <b>Покупка успешна!</b>\n\nВы получили VIP подписку на 7 дней!",
    shop_fail: "❌ <b>Недостаточно баллов!</b>\n\nПолучайте ежедневный бонус или приглашайте друзей.",

    vip_restricted: "🔒 <b>Эта функция доступна только для VIP пользователей!</b>\n\n💎 Оформите VIP, чтобы скачивать фильмы на телефон и смотреть без рекламы.",
    vip_restricted_fav: "🔒 <b>Избранное — только для VIP пользователей!</b>",
    vip_restricted_review: "🔒 <b>Отзывы — только для VIP пользователей!</b>",
    vip_restricted_report: "🔒 <b>Жалобы — только для VIP пользователей!</b>",
    vip_promo_start: "💎 <b>Преимущества VIP подписки:</b>\n\n✅ <b>Скачивание</b> фильмов на устройство\n✅ <b>Отзывы</b> и оценки к фильмам\n✅ <b>Избранное</b> и история просмотров\n✅ <b>Без рекламы</b> на максимальной скорости",
    vip_button_get: "💎 Купить VIP",
    vip_only_comment: "🔒 Только VIP пользователи могут оставлять отзывы!",

    search_prompt: "🔍 <b>Поиск фильма</b>\n\nОтправьте <b>название</b> или <b>код</b> фильма:\n\n<i>Например: «Титаник» или «1001»</i>",
    search_results: "🔎 Найдено по запросу <b>«{query}»</b> ({count} шт.):",
    search_hint: "\n💡 <i>Отправьте код в чат, чтобы начать просмотр.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Жанр: {genre}\n⭐️ Рейтинг: {rating} | 👁 Просмотры: {views}",

    review_rating_prompt: "⭐️ <b>Оцените фильм:</b>\n\n<i>Выберите от 1 до 5 звёзд:</i>",
    review_your_rating: "⭐️ Ваша оценка: <b>{rating}/5</b>\n\n✍️ Теперь напишите короткий отзыв о фильме:",
    review_success: "✅ <b>Ваш отзыв успешно сохранён!</b>\n\n⭐️ Оценка: {rating}/5\nСпасибо за ваше мнение!",
    review_cancel: "❌ Написание отзыва отменено.",
    review_text_error: "⚠️ Пожалуйста, отправьте текстовое сообщение.",
    comment_prompt: "✍️ Напишите ваше мнение о фильме:",
    comment_saved: "✅ Ваш отзыв сохранён! Спасибо.",
    report_sent: "✅ Ваша жалоба отправлена администратору. Спасибо!",

    error_general: "⚠️ <b>Произошла ошибка.</b>\nПожалуйста, попробуйте чуть позже.",
    not_found: "📭 <b>К сожалению, фильм не найден.</b>\n\nПроверьте правильность написания названия или кода.",
    cancel: "❌ Отмена",
    loading: "⏳ Загрузка...",
    page_prev: "⬅️ Назад",
    page_next: "Вперёд ➡️",
    page_info: "(Страница {page})",

    vip_admin_title: "💎 <b>Поиск VIP пользователя</b>\n\nВыберите из списка или отправьте имя/ID:",
    vip_search_result: "🔍 <b>Результаты поиска:</b> '{query}'",
    vip_select_duration: "⏳ Выберите длительность VIP для <b>{name}</b> (ID: {id}):",
    vip_granted: "✅ <b>Успешно!</b>\nПользователю {id} выдан VIP до {date}.",
    vip_notify_user: "🎉 <b>Поздравляем!</b>\n\nВам начислена VIP подписка на {days} дней!\n📅 Действует до: {date}.",

    settings_title: "⚙️ <b>Настройки</b>\n\nВыберите удобный язык интерфейса:",
    lang_changed: "✅ Язык успешно изменён: Русский 🇷🇺",

    sub_check_msg: "📢 <b>Чтобы пользоваться ботом, подпишитесь на каналы:</b>\n\n<i>После подписки нажмите кнопку «✅ Проверить»:</i>",
    sub_btn_join: "➕ Подписаться",
    sub_btn_check: "✅ Проверить",
    sub_success: "✅ <b>Спасибо! Подписка подтверждена.</b>\nПриятного просмотра!",
    sub_fail: "⚠️ <b>Вы подписались не на все каналы!</b>\n\nПожалуйста, подпишитесь на все каналы из списка и нажмите «Проверить».",

    admin_channel_menu: "📢 <b>Настройки обязательной подписки</b>\n\nСтатус: {status}",
    admin_channel_list: "📋 <b>Список каналов:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Добавить канал</b>\n\nОтправьте ссылку или ID канала.\n\n<i>Бот должен быть администратором!</i>",
    admin_channel_added: "✅ Канал успешно добавлен!",
    admin_channel_deleted: "🗑 Канал удалён.",

    request_prompt: "🎬 <b>Заказать фильм</b>\n\nКакой фильм вы хотите увидеть в боте? Напишите точное название:",
    request_success: "✅ <b>Запрос успешно принят!</b>\n\nАдминистраторы постараются добавить этот фильм в ближайшее время.",
    request_admin_notify: "📬 <b>Новый запрос фильма!</b>\n\n👤 Пользователь: <b>{name}</b>\n🆔 ID: <code>{id}</code>\n🎬 Фильм: <b>{movie}</b>",
};

const en = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Hello, {name}!</b>\n\n🍿 Welcome to <b>FilmX</b> — home of the best movies, premieres, and TV series!\n\n🔍 <b>Finding movies is simple:</b>\n├ 🔢 Send a movie <b>code</b> (e.g. <code>1025</code>)\n└ 📝 Or type the <b>title</b> (e.g. <i>Venom</i>)\n\n🌐 Tap <b>«🎬 Catalog»</b> below to explore our visual Mini App catalog!",

    menu_main: "🏠 Main menu",
    menu_cabinet: "👤 My cabinet",
    menu_search: "🔍 Search",
    menu_category: "📂 Categories",
    menu_random: "🎲 Random movie",
    menu_new: "🆕 New releases",
    menu_fav: "❤️ Favorites",
    menu_top: "🔥 Trending movies",
    menu_stats: "📊 My stats",
    menu_vip: "💎 VIP membership",
    menu_settings: "⚙️ Settings",
    menu_vote: "🗳 Request movie",
    menu_vip_status: "⏳ VIP status",
    menu_history: "📜 Watch history",
    menu_shop: "🛍 Points shop",
    menu_bonus: "🎁 Daily bonus",
    menu_invite: "🗣 Invite friends",
    menu_catalog: "🎬 Movie catalog",
    menu_recommend: "✨ AI Recommendations",

    vip_time_remaining: "⏳ <b>VIP Membership status:</b>\n\n📅 Time left: <b>{days} days, {hours} hours, {minutes} minutes</b>.",
    vip_expired: "⚠️ <b>Your VIP membership has expired.</b>",
    vip_active_badge: "💎 <b>VIP Status:</b> Active (⭐️ {days} days left)",

    bonus_claimed: "🎁 <b>Congratulations!</b>\n\nYou received <b>+25 points</b>!\n💰 Total: <b>{points} points</b>.",
    bonus_cooldown: "⏳ <b>You have already claimed today's bonus!</b>\n\nNext bonus in <b>{hours}h {minutes}m</b>.",

    referral_promo: "🗣 <b>Invite your friends and earn free VIP!</b>\n\nFor every 10 friends who join, you get <b>24 hours of VIP</b>!\n\n🔗 <b>Your referral link:</b>\n<code>{link}</code>",
    referral_progress: "👤 <b>New friend joined!</b> (Total: {count})\n🎉 <b>{left}</b> more friends needed to get VIP.",
    referral_milestone: "🎉 <b>CONGRATULATIONS!</b>\n\nYou invited 10 friends and earned <b>24 hours of VIP</b>!",

    shop_welcome: "🛍 <b>Points shop</b>\n\n💰 Your balance: <b>{points} points</b>\n\n💎 <b>7-day VIP access</b> — 5,000 points\n\n<i>Claim daily bonuses to grow your balance!</i>",
    shop_success: "✅ <b>Purchase successful!</b>\n\nYou received 7 days of VIP membership!",
    shop_fail: "❌ <b>Not enough points!</b>\n\nClaim daily bonuses or invite friends to earn points.",

    vip_restricted: "🔒 <b>This feature is for VIP members only!</b>\n\n💎 Upgrade to VIP to download movies directly to your device and watch ad-free.",
    vip_restricted_fav: "🔒 <b>Favorites list is available for VIP members only!</b>",
    vip_restricted_review: "🔒 <b>Writing reviews is available for VIP members only!</b>",
    vip_restricted_report: "🔒 <b>Reports are available for VIP members only!</b>",
    vip_promo_start: "💎 <b>VIP Membership perks:</b>\n\n✅ <b>Download</b> movies directly\n✅ Leave <b>reviews</b> and ratings\n✅ <b>Favorites</b> and watch history\n✅ <b>Ad-free</b> with maximum speed",
    vip_button_get: "💎 Get VIP",
    vip_only_comment: "🔒 Only VIP members can leave reviews!",

    search_prompt: "🔍 <b>Search movies</b>\n\nSend a movie <b>title</b> or <b>code</b>:\n\n<i>Example: «Titanic» or «1001»</i>",
    search_results: "🔎 Results for <b>\"{query}\"</b> ({count} items):",
    search_hint: "\n💡 <i>Send the code to chat to watch the movie.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Genre: {genre}\n⭐️ Rating: {rating} | 👁 Views: {views}",

    review_rating_prompt: "⭐️ <b>Rate this movie:</b>\n\n<i>Pick from 1 to 5 stars:</i>",
    review_your_rating: "⭐️ Your rating: <b>{rating}/5</b>\n\n✍️ Now write a short review:",
    review_success: "✅ <b>Your review has been saved!</b>\n\n⭐️ Rating: {rating}/5\nThank you for sharing your opinion!",
    review_cancel: "❌ Review cancelled.",
    review_text_error: "⚠️ Please send text.",
    comment_prompt: "✍️ Write your opinion about the movie:",
    comment_saved: "✅ Your review has been saved! Thank you.",
    report_sent: "✅ Your report was submitted to the admin. Thank you!",

    error_general: "⚠️ <b>An unexpected error occurred.</b>\nPlease try again later.",
    not_found: "📭 <b>Sorry, no movies found.</b>\n\nPlease check the spelling of the title or code.",
    cancel: "❌ Cancel",
    loading: "⏳ Loading...",
    page_prev: "⬅️ Prev",
    page_next: "Next ➡️",
    page_info: "(Page {page})",

    vip_admin_title: "💎 <b>Find VIP user</b>\n\nPick from the list or send name/ID:",
    vip_search_result: "🔍 <b>Search results:</b> '{query}'",
    vip_select_duration: "⏳ Select VIP duration for <b>{name}</b> (ID: {id}):",
    vip_granted: "✅ <b>Success!</b>\nUser {id} received VIP until {date}.",
    vip_notify_user: "🎉 <b>Congratulations!</b>\n\nYou received VIP access for {days} days!\n📅 Valid until: {date}.",

    settings_title: "⚙️ <b>Settings</b>\n\nSelect your preferred language:",
    lang_changed: "✅ Language changed: English 🇬🇧",

    sub_check_msg: "📢 <b>Please subscribe to our channels to use the bot:</b>\n\n<i>After subscribing, tap «✅ Check»:</i>",
    sub_btn_join: "➕ Join",
    sub_btn_check: "✅ Check",
    sub_success: "✅ <b>Thank you! Subscription verified.</b>\nEnjoy your movies!",
    sub_fail: "⚠️ <b>You haven't joined all required channels!</b>\n\nPlease join all channels and tap Check again.",

    admin_channel_menu: "📢 <b>Mandatory subscription settings</b>\n\nStatus: {status}",
    admin_channel_list: "📋 <b>Channel list:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Add a channel</b>\n\nSend channel link or ID.\n\n<i>Bot must be an admin!</i>",
    admin_channel_added: "✅ Channel added successfully!",
    admin_channel_deleted: "🗑 Channel deleted.",

    request_prompt: "🎬 <b>Request a movie</b>\n\nWhich movie should we add? Write the exact title:",
    request_success: "✅ <b>Your request was received!</b>\n\nOur team will review and add it soon.",
    request_admin_notify: "📬 <b>New movie request!</b>\n\n👤 User: <b>{name}</b>\n🆔 ID: <code>{id}</code>\n🎬 Movie: <b>{movie}</b>",
};

export const locales = { uz, ru, en };

export const SUPPORTED_LANGUAGES = Object.keys(locales);

/**
 * Tarjimani oladi va {param} larni almashtiradi.
 * Kalit topilmasa `uz` ga, u ham topilmasa kalitning o'ziga qaytadi.
 */
export const getTranslation = (lang, key, params = {}) => {
    const dictionary = locales[lang] || uz;
    let text = dictionary[key] ?? uz[key] ?? key;

    for (const [param, value] of Object.entries(params)) {
        text = text.split(`{${param}}`).join(String(value ?? ''));
    }

    return text;
};

/** ctx.t uchun tarjimon yaratadi */
export const createTranslator = (lang) => (key, params) => getTranslation(lang, key, params);

export default locales;
