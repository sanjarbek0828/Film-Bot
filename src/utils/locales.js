/**
 * Ko'p tilli matnlar (i18n).
 *
 * Muhim tuzatishlar:
 *  - Yetishmayotgan kalitlar qo'shildi: `review_rating_prompt`, `review_your_rating`,
 *    `review_success`, `review_cancel` (avval bot foydalanuvchiga kalit nomini
 *    ko'rsatib qo'yardi, masalan "review_rating_prompt").
 *  - Takrorlangan `settings_title` kalitlari olib tashlandi.
 *  - `ru` va `en` uchun to'liq to'ldirildi (avval yarmi yo'q edi).
 *  - Parametr almashtirish global (avval faqat birinchi uchrashuv almashardi).
 */

const uz = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Salom, {name}!</b>\n\n🎥 Eng sara kinolar shu yerda. Kino <b>kodini</b> yoki <b>nomini</b> yuboring:",

    menu_main: "🏠 Bosh menyu",
    menu_cabinet: "👤 Shaxsiy kabinet",
    menu_search: "🔍 Qidirish",
    menu_category: "📂 Kategoriyalar",
    menu_random: "🎲 Tasodifiy kino",
    menu_new: "🆕 Yangi kinolar",
    menu_fav: "❤️ Sevimlilar",
    menu_top: "🔥 Top kinolar",
    menu_stats: "📊 Mening statistikam",
    menu_vip: "💎 VIP boshqaruv",
    menu_settings: "⚙️ Sozlamalar",
    menu_vote: "🗳 Kino so'rash",
    menu_vip_status: "⏳ VIP vaqti",
    menu_history: "📜 Ko'rishlar tarixi",
    menu_shop: "🛍 Do'kon",
    menu_bonus: "🎁 Kunlik bonus",
    menu_invite: "🗣 Do'stlarni taklif qilish",
    menu_catalog: "🌐 Kinolar katalogi",
    menu_recommend: "✨ Menga tavsiya qil",

    vip_time_remaining: "⏳ <b>VIP vaqtingiz:</b>\n\n📅 {days} kun, {hours} soat, {minutes} daqiqa qoldi.",
    vip_expired: "⚠️ VIP vaqtingiz tugagan.",
    vip_active_badge: "💎 <b>VIP:</b> Aktiv ({days} kun qoldi)",

    bonus_claimed: "🎁 +25 ball qo'shildi!\nJami: {points} ball",
    bonus_cooldown: "⏳ <b>Kutib turing!</b>\nKeyingi bonus {hours} soat {minutes} daqiqadan so'ng.",

    referral_promo: "🗣 <b>Do'stlarni taklif qiling!</b>\nHar 10 ta do'st uchun <b>24 soat VIP</b> oling!\n\n🔗 Havolangiz:\n<code>{link}</code>",
    referral_progress: "👤 Do'st qo'shildi! (Jami: {count})\n🎉 VIP uchun yana <b>{left} ta</b> do'st kerak.",
    referral_milestone: "🎉 <b>TABRIKLAYMIZ!</b>\n\nSiz 10 ta do'st taklif qildingiz va <b>24 soatlik VIP</b> oldingiz!",

    shop_welcome: "🛍 <b>Ballar do'koni</b>\n\n💰 Balingiz: <b>{points}</b>\n\n💎 <b>7 kunlik VIP</b> — 5000 ball",
    shop_success: "✅ <b>Xarid muvaffaqiyatli!</b>\n\nSiz 7 kunlik VIP sotib oldingiz!",
    shop_fail: "❌ <b>Ball yetarli emas!</b>\n\nKunlik bonus olib ball to'plang.",

    vip_restricted: "🔒 Bu funksiya <b>VIP</b> foydalanuvchilar uchun.",
    vip_restricted_fav: "🔒 <b>Sevimlilar — faqat VIP uchun!</b>",
    vip_restricted_review: "🔒 <b>Sharhlar — faqat VIP uchun!</b>",
    vip_restricted_report: "🔒 <b>Shikoyat — faqat VIP uchun!</b>",
    vip_promo_start: "💎 <b>VIP obuna oling!</b>\n\n✅ Kinolarni <b>yuklab olish</b>\n✅ <b>Sharh</b> qoldirish\n✅ <b>Sevimlilar</b> va <b>tarix</b>",
    vip_button_get: "💎 VIP olish",
    vip_only_comment: "🔒 Faqat VIP foydalanuvchilar sharh qoldira oladi!",

    search_prompt: "✍️ <b>Kino qidirish</b>\n\nKino kodini yoki nomini yozing:",
    search_results: "🔎 <b>\"{query}\"</b> natijalari ({count} ta):",
    search_hint: "\n<i>Kinoni ko'rish uchun kodini yuboring.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Janr: {genre}\n⭐️ Reyting: {rating} | 👁 {views}",

    review_rating_prompt: "⭐️ <b>Kinoga baho bering:</b>\n\n<i>1 dan 5 gacha yulduz tanlang.</i>",
    review_your_rating: "⭐️ Bahoyingiz: <b>{rating}/5</b>\n\n✍️ Endi qisqa sharh yozib yuboring:",
    review_success: "✅ <b>Sharhingiz saqlandi!</b>\n\n⭐️ Baho: {rating}/5\n\nRahmat!",
    review_cancel: "❌ Sharh qoldirish bekor qilindi.",
    review_text_error: "⚠️ Iltimos, matn yuboring.",
    comment_prompt: "✍️ Kino haqida fikringizni yozing:",
    comment_saved: "✅ Sharhingiz saqlandi! Rahmat.",
    report_sent: "✅ Shikoyatingiz adminga yuborildi. Rahmat!",

    error_general: "❌ Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",
    not_found: "📭 Hech narsa topilmadi.",
    cancel: "❌ Bekor qilish",
    loading: "⏳ Yuklanmoqda...",
    page_prev: "⬅️ Oldingi",
    page_next: "Keyingi ➡️",
    page_info: "(Sahifa {page})",

    vip_admin_title: "💎 <b>VIP foydalanuvchi qidirish</b>\n\nRo'yxatdan tanlang yoki ism/ID yuboring:",
    vip_search_result: "🔍 <b>Qidiruv natijalari:</b> '{query}'",
    vip_select_duration: "⏳ <b>{name}</b> (ID: {id}) uchun VIP muddatini tanlang:",
    vip_granted: "✅ <b>Muvaffaqiyatli!</b>\nFoydalanuvchi {id} ga VIP {date} gacha berildi.",
    vip_notify_user: "🎉 <b>Tabriklaymiz!</b>\n\nSizga {days} kunga VIP berildi!\n📅 Muddat: {date} gacha.",

    settings_title: "⚙️ <b>Sozlamalar</b>\n\nO'zgartirmoqchi bo'lgan bo'limni tanlang:",
    lang_changed: "✅ Til o'zgartirildi: O'zbekcha",

    sub_check_msg: "🚫 <b>Botdan foydalanish uchun kanallarga a'zo bo'ling:</b>",
    sub_btn_join: "➕ A'zo bo'lish",
    sub_btn_check: "✅ Tekshirish",
    sub_success: "✅ <b>Rahmat!</b> Obuna tasdiqlandi.",
    sub_fail: "❌ <b>Siz hali barcha kanallarga a'zo bo'lmadingiz!</b>",

    admin_channel_menu: "📢 <b>Majburiy obuna sozlamalari</b>\n\nHolat: {status}",
    admin_channel_list: "📋 <b>Kanallar ro'yxati:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Kanal qo'shish</b>\n\nKanal linkini yoki IDsini yuboring.\n\n<i>Bot kanalga admin bo'lishi shart!</i>",
    admin_channel_added: "✅ Kanal qo'shildi!",
    admin_channel_deleted: "🗑 Kanal o'chirildi.",

    request_prompt: "🎬 <b>Kino so'rash</b>\n\nQaysi kinoni qo'shishimizni xohlaysiz? Nomini yozing:",
    request_success: "✅ <b>So'rovingiz qabul qilindi!</b>\n\nAdmin tez orada ko'rib chiqadi. Rahmat!",
    request_admin_notify: "📬 <b>Yangi kino so'rovi!</b>\n\n👤 Foydalanuvchi: <b>{name}</b>\n🆔 ID: <code>{id}</code>\n🎬 Kino: <b>{movie}</b>",
};

const ru = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Привет, {name}!</b>\n\n🎥 Лучшие фильмы здесь. Отправьте <b>код</b> или <b>название</b> фильма:",

    menu_main: "🏠 Главное меню",
    menu_cabinet: "👤 Личный кабинет",
    menu_search: "🔍 Поиск",
    menu_category: "📂 Категории",
    menu_random: "🎲 Случайный фильм",
    menu_new: "🆕 Новинки",
    menu_fav: "❤️ Избранное",
    menu_top: "🔥 Топ фильмы",
    menu_stats: "📊 Моя статистика",
    menu_vip: "💎 VIP управление",
    menu_settings: "⚙️ Настройки",
    menu_vote: "🗳 Заказать фильм",
    menu_vip_status: "⏳ Время VIP",
    menu_history: "📜 История просмотров",
    menu_shop: "🛍 Магазин",
    menu_bonus: "🎁 Ежедневный бонус",
    menu_invite: "🗣 Пригласить друзей",
    menu_catalog: "🌐 Каталог фильмов",
    menu_recommend: "✨ Порекомендовать",

    vip_time_remaining: "⏳ <b>Ваше время VIP:</b>\n\n📅 Осталось {days} дн., {hours} ч., {minutes} мин.",
    vip_expired: "⚠️ Ваше время VIP истекло.",
    vip_active_badge: "💎 <b>VIP:</b> Активен (осталось {days} дн.)",

    bonus_claimed: "🎁 +25 баллов!\nВсего: {points}",
    bonus_cooldown: "⏳ <b>Подождите!</b>\nСледующий бонус через {hours} ч. {minutes} мин.",

    referral_promo: "🗣 <b>Приглашайте друзей!</b>\nЗа каждые 10 друзей — <b>24 часа VIP</b>!\n\n🔗 Ваша ссылка:\n<code>{link}</code>",
    referral_progress: "👤 Друг добавлен! (Всего: {count})\n🎉 До VIP осталось <b>{left}</b> друзей.",
    referral_milestone: "🎉 <b>ПОЗДРАВЛЯЕМ!</b>\n\nВы пригласили 10 друзей и получили <b>24 часа VIP</b>!",

    shop_welcome: "🛍 <b>Магазин баллов</b>\n\n💰 Ваш баланс: <b>{points}</b>\n\n💎 <b>VIP на 7 дней</b> — 5000 баллов",
    shop_success: "✅ <b>Покупка успешна!</b>\n\nВы приобрели VIP на 7 дней!",
    shop_fail: "❌ <b>Недостаточно баллов!</b>\n\nПолучайте ежедневный бонус.",

    vip_restricted: "🔒 Эта функция только для <b>VIP</b> пользователей.",
    vip_restricted_fav: "🔒 <b>Избранное — только для VIP!</b>",
    vip_restricted_review: "🔒 <b>Отзывы — только для VIP!</b>",
    vip_restricted_report: "🔒 <b>Жалобы — только для VIP!</b>",
    vip_promo_start: "💎 <b>Оформите VIP!</b>\n\n✅ <b>Скачивание</b> фильмов\n✅ <b>Отзывы</b>\n✅ <b>Избранное</b> и <b>история</b>",
    vip_button_get: "💎 Купить VIP",
    vip_only_comment: "🔒 Только VIP пользователи могут оставлять отзывы!",

    search_prompt: "✍️ <b>Поиск фильма</b>\n\nОтправьте название или код:",
    search_results: "🔎 Результаты по <b>\"{query}\"</b> ({count}):",
    search_hint: "\n<i>Отправьте код, чтобы посмотреть фильм.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Жанр: {genre}\n⭐️ Рейтинг: {rating} | 👁 {views}",

    review_rating_prompt: "⭐️ <b>Оцените фильм:</b>\n\n<i>Выберите от 1 до 5 звёзд.</i>",
    review_your_rating: "⭐️ Ваша оценка: <b>{rating}/5</b>\n\n✍️ Теперь напишите короткий отзыв:",
    review_success: "✅ <b>Отзыв сохранён!</b>\n\n⭐️ Оценка: {rating}/5\n\nСпасибо!",
    review_cancel: "❌ Отзыв отменён.",
    review_text_error: "⚠️ Пожалуйста, отправьте текст.",
    comment_prompt: "✍️ Напишите ваше мнение о фильме:",
    comment_saved: "✅ Ваш отзыв сохранён! Спасибо.",
    report_sent: "✅ Жалоба отправлена админу. Спасибо!",

    error_general: "❌ Произошла ошибка. Попробуйте позже.",
    not_found: "📭 Ничего не найдено.",
    cancel: "❌ Отмена",
    loading: "⏳ Загрузка...",
    page_prev: "⬅️ Назад",
    page_next: "Вперёд ➡️",
    page_info: "(Страница {page})",

    vip_admin_title: "💎 <b>Поиск VIP пользователя</b>\n\nВыберите из списка или отправьте имя/ID:",
    vip_search_result: "🔍 <b>Результаты поиска:</b> '{query}'",
    vip_select_duration: "⏳ Выберите длительность VIP для <b>{name}</b> (ID: {id}):",
    vip_granted: "✅ <b>Успешно!</b>\nПользователю {id} выдан VIP до {date}.",
    vip_notify_user: "🎉 <b>Поздравляем!</b>\n\nВам выдан VIP на {days} дней!\n📅 До: {date}.",

    settings_title: "⚙️ <b>Настройки</b>\n\nВыберите раздел:",
    lang_changed: "✅ Язык изменён: Русский",

    sub_check_msg: "🚫 <b>Подпишитесь на каналы, чтобы пользоваться ботом:</b>",
    sub_btn_join: "➕ Подписаться",
    sub_btn_check: "✅ Проверить",
    sub_success: "✅ <b>Спасибо!</b> Подписка подтверждена.",
    sub_fail: "❌ <b>Вы подписались не на все каналы!</b>",

    admin_channel_menu: "📢 <b>Настройки обязательной подписки</b>\n\nСтатус: {status}",
    admin_channel_list: "📋 <b>Список каналов:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Добавить канал</b>\n\nОтправьте ссылку или ID канала.\n\n<i>Бот должен быть админом!</i>",
    admin_channel_added: "✅ Канал добавлен!",
    admin_channel_deleted: "🗑 Канал удалён.",

    request_prompt: "🎬 <b>Заказать фильм</b>\n\nКакой фильм добавить? Напишите название:",
    request_success: "✅ <b>Запрос принят!</b>\n\nАдмин скоро рассмотрит. Спасибо!",
    request_admin_notify: "📬 <b>Новый запрос фильма!</b>\n\n👤 Пользователь: <b>{name}</b>\n🆔 ID: <code>{id}</code>\n🎬 Фильм: <b>{movie}</b>",
};

const en = {
    language_select: "🇺🇿 Tilni tanlang / Выберите язык / Select language:",
    welcome: "👋 <b>Hello, {name}!</b>\n\n🎥 The best movies are here. Send a movie <b>code</b> or <b>title</b>:",

    menu_main: "🏠 Main menu",
    menu_cabinet: "👤 My cabinet",
    menu_search: "🔍 Search",
    menu_category: "📂 Categories",
    menu_random: "🎲 Random movie",
    menu_new: "🆕 New movies",
    menu_fav: "❤️ Favorites",
    menu_top: "🔥 Top movies",
    menu_stats: "📊 My stats",
    menu_vip: "💎 VIP management",
    menu_settings: "⚙️ Settings",
    menu_vote: "🗳 Request a movie",
    menu_vip_status: "⏳ VIP time",
    menu_history: "📜 Watch history",
    menu_shop: "🛍 Shop",
    menu_bonus: "🎁 Daily bonus",
    menu_invite: "🗣 Invite friends",
    menu_catalog: "🌐 Movie catalog",
    menu_recommend: "✨ Recommend for me",

    vip_time_remaining: "⏳ <b>Your VIP time:</b>\n\n📅 {days} days, {hours} hours, {minutes} minutes left.",
    vip_expired: "⚠️ Your VIP has expired.",
    vip_active_badge: "💎 <b>VIP:</b> Active ({days} days left)",

    bonus_claimed: "🎁 +25 points!\nTotal: {points}",
    bonus_cooldown: "⏳ <b>Please wait!</b>\nNext bonus in {hours}h {minutes}m.",

    referral_promo: "🗣 <b>Invite your friends!</b>\nGet <b>24 hours of VIP</b> for every 10 friends!\n\n🔗 Your link:\n<code>{link}</code>",
    referral_progress: "👤 Friend joined! (Total: {count})\n🎉 <b>{left}</b> more friends until VIP.",
    referral_milestone: "🎉 <b>CONGRATULATIONS!</b>\n\nYou invited 10 friends and earned <b>24 hours of VIP</b>!",

    shop_welcome: "🛍 <b>Points shop</b>\n\n💰 Your balance: <b>{points}</b>\n\n💎 <b>7-day VIP</b> — 5000 points",
    shop_success: "✅ <b>Purchase successful!</b>\n\nYou bought 7 days of VIP!",
    shop_fail: "❌ <b>Not enough points!</b>\n\nClaim your daily bonus.",

    vip_restricted: "🔒 This feature is for <b>VIP</b> users only.",
    vip_restricted_fav: "🔒 <b>Favorites — VIP only!</b>",
    vip_restricted_review: "🔒 <b>Reviews — VIP only!</b>",
    vip_restricted_report: "🔒 <b>Reports — VIP only!</b>",
    vip_promo_start: "💎 <b>Get VIP!</b>\n\n✅ <b>Download</b> movies\n✅ Leave <b>reviews</b>\n✅ <b>Favorites</b> and <b>history</b>",
    vip_button_get: "💎 Get VIP",
    vip_only_comment: "🔒 Only VIP users can leave reviews!",

    search_prompt: "✍️ <b>Search a movie</b>\n\nSend a title or code:",
    search_results: "🔎 Results for <b>\"{query}\"</b> ({count}):",
    search_hint: "\n<i>Send the code to watch the movie.</i>",
    movie_found: "🎬 <b>{title}</b>\n🎭 Genre: {genre}\n⭐️ Rating: {rating} | 👁 {views}",

    review_rating_prompt: "⭐️ <b>Rate this movie:</b>\n\n<i>Pick from 1 to 5 stars.</i>",
    review_your_rating: "⭐️ Your rating: <b>{rating}/5</b>\n\n✍️ Now write a short review:",
    review_success: "✅ <b>Review saved!</b>\n\n⭐️ Rating: {rating}/5\n\nThank you!",
    review_cancel: "❌ Review cancelled.",
    review_text_error: "⚠️ Please send text.",
    comment_prompt: "✍️ Write your opinion about the movie:",
    comment_saved: "✅ Your review has been saved! Thank you.",
    report_sent: "✅ Your report was sent to the admin. Thank you!",

    error_general: "❌ An error occurred. Please try again later.",
    not_found: "📭 Nothing found.",
    cancel: "❌ Cancel",
    loading: "⏳ Loading...",
    page_prev: "⬅️ Prev",
    page_next: "Next ➡️",
    page_info: "(Page {page})",

    vip_admin_title: "💎 <b>Find a VIP user</b>\n\nPick from the list or send a name/ID:",
    vip_search_result: "🔍 <b>Search results:</b> '{query}'",
    vip_select_duration: "⏳ Select VIP duration for <b>{name}</b> (ID: {id}):",
    vip_granted: "✅ <b>Success!</b>\nUser {id} received VIP until {date}.",
    vip_notify_user: "🎉 <b>Congratulations!</b>\n\nYou received VIP for {days} days!\n📅 Valid until: {date}.",

    settings_title: "⚙️ <b>Settings</b>\n\nSelect a section:",
    lang_changed: "✅ Language changed: English",

    sub_check_msg: "🚫 <b>Please subscribe to these channels to use the bot:</b>",
    sub_btn_join: "➕ Join",
    sub_btn_check: "✅ Check",
    sub_success: "✅ <b>Thank you!</b> Subscription verified.",
    sub_fail: "❌ <b>You haven't joined all channels yet!</b>",

    admin_channel_menu: "📢 <b>Mandatory subscription settings</b>\n\nStatus: {status}",
    admin_channel_list: "📋 <b>Channel list:</b>\n\n{list}",
    admin_channel_add_prompt: "✍️ <b>Add a channel</b>\n\nSend the channel link or ID.\n\n<i>The bot must be an admin!</i>",
    admin_channel_added: "✅ Channel added!",
    admin_channel_deleted: "🗑 Channel deleted.",

    request_prompt: "🎬 <b>Request a movie</b>\n\nWhich movie should we add? Write the title:",
    request_success: "✅ <b>Request received!</b>\n\nThe admin will review it soon. Thank you!",
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
