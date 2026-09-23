export const WebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

// HMAC initData sarlavhasi
export const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Telegram-Init-Data': WebApp?.initData || '',
});

// Haptic feedback yordamchisi
export const triggerHaptic = (type = 'light') => {
  try {
    if (!WebApp?.HapticFeedback) return;
    if (type === 'success' || type === 'warning' || type === 'error') {
      WebApp.HapticFeedback.notificationOccurred(type);
    } else {
      WebApp.HapticFeedback.impactOccurred(type);
    }
  } catch {
    /* Eski brauzerlar */
  }
};

const GENRE_EMOJI = {
  jangari: '💥', boevik: '💥', action: '💥',
  komediya: '😂', comedy: '😂',
  fantastika: '🛸', 'sci-fi': '🛸',
  qorqinchli: '👻', dahshat: '👻', horror: '👻',
  drama: '🎭', melodrama: '💔', romance: '💔',
  multfilm: '🦁', animatsiya: '🦁', animation: '🦁',
  sarguzasht: '🗺️', adventure: '🗺️',
  kriminal: '🕵️', crime: '🕵️', detektiv: '🕵️',
  triller: '🔪', thriller: '🔪',
  tarixiy: '📜', history: '📜',
  hujjatli: '📽️', anime: '⚔️',
};

export const getGenreEmoji = (genre = '') => {
  const g = String(genre).toLowerCase();
  for (const key of Object.keys(GENRE_EMOJI)) {
    if (g.includes(key)) return GENRE_EMOJI[key];
  }
  return '🍿';
};

export const displayTitle = (movie) => {
  if (!movie) return 'Kino';
  if (movie.title && !/^Kino #\d+$/i.test(movie.title)) return movie.title;
  return `Kino #${movie.code}`;
};

export const posterUrl = (movie) => {
  if (!movie?.poster) return null;
  if (movie.poster.startsWith('http://') || movie.poster.startsWith('https://')) {
    return movie.poster;
  }
  return `/api/image/${movie.poster}`;
};

export const episodeNumber = (title = '') => {
  const match = String(title).match(/-\s*(\d+)\s*-?\s*qism/i);
  return match ? match[1] : null;
};
