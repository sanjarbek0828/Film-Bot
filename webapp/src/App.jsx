import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Play, Hash, X, Home, Compass, Heart, ArrowUp, 
  Sparkles, Star, Film, Share2, Check, Clock, Eye, ShieldCheck, 
  Tv, MessageCircle, HelpCircle, User as UserIcon, Send
} from 'lucide-react';

const WebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

// HMAC initData sarlavhasi
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Telegram-Init-Data': WebApp?.initData || '',
});

// Haptic feedback yordamchisi
const triggerHaptic = (type = 'light') => {
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

const getGenreEmoji = (genre = '') => {
  const g = String(genre).toLowerCase();
  for (const key of Object.keys(GENRE_EMOJI)) {
    if (g.includes(key)) return GENRE_EMOJI[key];
  }
  return '🍿';
};

const displayTitle = (movie) => {
  if (!movie) return 'Kino';
  if (movie.title && !/^Kino #\d+$/i.test(movie.title)) return movie.title;
  return `Kino #${movie.code}`;
};

const posterUrl = (movie) => {
  if (!movie?.poster) return null;
  if (movie.poster.startsWith('http://') || movie.poster.startsWith('https://')) {
    return movie.poster;
  }
  return `/api/image/${movie.poster}`;
};

const episodeNumber = (title = '') => {
  const match = String(title).match(/-\s*(\d+)\s*-?\s*qism/i);
  return match ? match[1] : null;
};

// Zaxira poster (agar rasm yuklanmasa)
const FallbackPoster = ({ title, code, genre }) => (
  <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-center relative overflow-hidden">
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-inner">
      <Film className="w-6 h-6 text-red-500" />
    </div>
    <span className="text-[11px] font-bold text-gray-200 line-clamp-2 px-1">
      {title || `Kino #${code}`}
    </span>
    {genre && (
      <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
        {genre.split(',')[0]}
      </span>
    )}
  </div>
);

export default function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [botInfo, setBotInfo] = useState({ username: '', supportUsername: 'sanjarbek_404' });
  const [loading, setLoading] = useState(true);

  // Navigatsiya va qidiruv
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'search' | 'favorites' | 'profile'
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  // Modal va UI holati
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [toast, setToast] = useState(null);
  const [sendingMovie, setSendingMovie] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sevimlilar
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favs') || '[]');
    } catch {
      return [];
    }
  });
  const favCodes = useMemo(() => new Set(favorites.map((f) => f.code)), [favorites]);

  const telegramUser = WebApp?.initDataUnsafe?.user;
  const observerRef = useRef();

  // ═══════════════════ Telegram Mini App Initsializatsiyasi ═══════════════════
  useEffect(() => {
    if (!WebApp) return;
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.enableClosingConfirmation?.();
      WebApp.setHeaderColor?.('#090a0f');
      WebApp.setBackgroundColor?.('#090a0f');
    } catch {
      /* noop */
    }
  }, []);

  // Telegram BackButton integratsiyasi
  useEffect(() => {
    if (!WebApp?.BackButton) return;

    if (selectedMovie) {
      WebApp.BackButton.show();
      const handleBack = () => {
        triggerHaptic('light');
        setSelectedMovie(null);
      };
      WebApp.BackButton.onClick(handleBack);
      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    } else if (activeTab !== 'home') {
      WebApp.BackButton.show();
      const handleBack = () => {
        triggerHaptic('light');
        setActiveTab('home');
      };
      WebApp.BackButton.onClick(handleBack);
      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    } else {
      WebApp.BackButton.hide();
    }
  }, [selectedMovie, activeTab]);

  // ═══════════════════ Ma'lumotlarni serverdan yuklash ═══════════════════
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const [moviesRes, genresRes, infoRes] = await Promise.all([
          fetch('/api/movies?limit=80&sort=new').then((r) => (r.ok ? r.json() : { items: [] })),
          fetch('/api/genres').then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/bot-info').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        ]);

        if (isCancelled) return;
        setMovies(Array.isArray(moviesRes?.items) ? moviesRes.items : []);
        setGenres(Array.isArray(genresRes) ? genresRes.map((g) => g.name) : []);
        if (infoRes?.username) setBotInfo(infoRes);
      } catch (err) {
        console.error('Initial load error:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Server bilan sevimlilarni sinxronizatsiya qilish
  useEffect(() => {
    if (!telegramUser?.id || !WebApp?.initData) return;
    fetch('/api/favorites', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFavorites(data);
        }
      })
      .catch(() => {});
  }, [telegramUser?.id]);

  useEffect(() => {
    try {
      localStorage.setItem('favs', JSON.stringify(favorites));
    } catch {
      /* noop */
    }
  }, [favorites]);

  // ═══════════════════ Qidiruv (Debounce + Server / Client) ═══════════════════
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([]);
      setIsSearchingServer(false);
      return;
    }

    // 1) Klientdagi kinolarni filtrlaymiz
    const localMatches = movies.filter((m) => {
      const titleMatch = m.title && m.title.toLowerCase().includes(debouncedSearch);
      const codeMatch = String(m.code).includes(debouncedSearch);
      return titleMatch || codeMatch;
    });

    setSearchResults(localMatches);

    // 2) Server qidiruvi (agar lokal ro'yxatda kam bo'lsa yoki aniqroq topish uchun)
    let active = true;
    setIsSearchingServer(true);
    fetch(`/api/movies?search=${encodeURIComponent(debouncedSearch)}&limit=40`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((res) => {
        if (!active) return;
        const serverItems = Array.isArray(res?.items) ? res.items : [];
        // Birlashtirib unikal qilamiz
        const combined = [...localMatches];
        const existingCodes = new Set(localMatches.map((m) => m.code));
        for (const item of serverItems) {
          if (!existingCodes.has(item.code)) {
            combined.push(item);
            existingCodes.add(item.code);
          }
        }
        setSearchResults(combined);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsSearchingServer(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, movies]);

  // ═══════════════════ Scroll & Infinite Sentinel ═══════════════════
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    triggerHaptic('light');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sentinelRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 18);
      }
    });
    if (node) observerRef.current.observe(node);
  }, []);

  // ═══════════════════ Kinoni Tomosha Qilish (Play / Botga Yuborish) ═══════════════════
  const handleWatchMovie = async (movie) => {
    if (!movie) return;
    triggerHaptic('medium');
    setSendingMovie(true);

    try {
      // 1. WebApp.sendData sinaymiz (agar reply keyboarddan ochilgan bo'lsa)
      let sendDataWorked = false;
      try {
        if (WebApp?.sendData) {
          WebApp.sendData(JSON.stringify({ action: 'play_movie', code: movie.code }));
          sendDataWorked = true;
        }
      } catch {
        /* sendData inline da ishlamaydi */
      }

      // 2. Server API orqali foydalanuvchining chatiga yuboramiz
      let apiWorked = false;
      if (WebApp?.initData) {
        const res = await fetch('/api/movies/play', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ code: movie.code }),
        });
        if (res.ok) apiWorked = true;
      }

      triggerHaptic('success');

      if (sendDataWorked || apiWorked) {
        setToast({
          type: 'success',
          text: `«${displayTitle(movie)}» botingizga yuborildi!`,
        });
        // 1.5 soniyadan keyin WebApp yopiladi yoki modal o'zgaradi
        setTimeout(() => {
          setSendingMovie(false);
          if (WebApp?.close) WebApp.close();
        }, 1200);
      } else {
        // Agar WebApp Telegram tashqarisida ochilgan bo'lsa yoki auth bo'lmasa
        const botName = botInfo.username || 'FilmXBot';
        const tgLink = `https://t.me/${botName}?start=${movie.code}`;
        if (WebApp?.openTelegramLink) {
          WebApp.openTelegramLink(tgLink);
        } else {
          window.open(tgLink, '_blank');
        }
        setToast({
          type: 'info',
          text: `Kino kodi: ${movie.code}. Telegram chatga o'tildi.`,
        });
        setSendingMovie(false);
      }
    } catch (err) {
      console.error('Play error:', err);
      setToast({ type: 'error', text: 'Kino yuborishda xatolik bo\'ldi.' });
      setSendingMovie(false);
    }
  };

  // ═══════════════════ Sevimlilarni Toggle Qilish ═══════════════════
  const toggleFavorite = useCallback((e, movie) => {
    e?.stopPropagation?.();
    triggerHaptic('light');

    const isFav = favCodes.has(movie.code);
    setFavorites((prev) =>
      isFav ? prev.filter((f) => f.code !== movie.code) : [movie, ...prev]
    );

    setToast({
      type: 'info',
      text: isFav ? 'Sevimlilardan olib tashlandi' : '❤️ Sevimlilarga saqlandi',
    });

    if (telegramUser?.id && movie._id && WebApp?.initData) {
      fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ movieId: movie._id }),
      }).catch(() => {});
    }
  }, [favCodes, telegramUser?.id]);

  // ═══════════════════ Ulashish (Share) ═══════════════════
  const handleShare = (movie) => {
    triggerHaptic('light');
    const botName = botInfo.username || 'FilmXBot';
    const link = `https://t.me/${botName}?start=kino_${movie.code}`;

    if (navigator.share) {
      navigator.share({
        title: displayTitle(movie),
        text: `🎬 ${displayTitle(movie)} filmini tomosha qiling! Kod: ${movie.code}`,
        url: link,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText?.(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      setToast({ type: 'success', text: 'Havola nusxalandi!' });
    }
  };

  // ═══════════════════ Saralangan ro'yxatlar ═══════════════════
  const newMovies = useMemo(() => movies.slice(0, 16), [movies]);
  const topMovies = useMemo(
    () => [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 16),
    [movies]
  );
  const featuredPool = useMemo(() => topMovies.slice(0, 5), [topMovies]);
  const featured = featuredPool[heroIndex] || null;

  // Hero auto-slider
  useEffect(() => {
    if (featuredPool.length < 2) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredPool.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredPool.length]);

  const categoryList = useMemo(() => ['Barchasi', ...genres].slice(0, 20), [genres]);

  const categoryMovies = useMemo(() => {
    if (selectedCategory === 'Barchasi') return movies;
    const term = selectedCategory.toLowerCase();
    return movies.filter((m) => m.genre && m.genre.toLowerCase().includes(term));
  }, [movies, selectedCategory]);

  // Toastni avto-yashirish
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ═══════════════════ KINO KARTASI KOMPONENTI ═══════════════════
  const MovieCard = useCallback(({ movie, index, isBig = false }) => {
    const isFav = favCodes.has(movie.code);
    const episode = episodeNumber(movie.title);
    const poster = posterUrl(movie);
    const [imgFailed, setImgFailed] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          triggerHaptic('light');
          setSelectedMovie(movie);
        }}
        className={`flex-none flex flex-col relative group cursor-pointer snap-start ${
          isBig ? 'w-36 sm:w-44 md:w-48' : 'w-28 sm:w-36 md:w-40'
        }`}
      >
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 aspect-[2/3] w-full shadow-lg group-hover:border-red-500/50 transition-all duration-300">
          {!imgFailed && poster ? (
            <img
              src={poster}
              alt={displayTitle(movie)}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <FallbackPoster title={movie.title} code={movie.code} genre={movie.genre} />
          )}

          {/* Qorong'i gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

          {/* Yuqori chap: Sevimli tugmasi */}
          <button
            onClick={(e) => toggleFavorite(e, movie)}
            aria-label="Sevimli"
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 active:scale-90 transition-transform z-10"
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white/80'}`} />
          </button>

          {/* Yuqori o'ng: Kod va Qism badge'lari */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
            <div className="bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-white/95 border border-white/15 flex items-center gap-0.5 shadow">
              <Hash className="w-2.5 h-2.5 text-red-500" />
              <span>{movie.code}</span>
            </div>
            {episode && (
              <div className="bg-red-600 px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow uppercase tracking-wider">
                {episode}-qism
              </div>
            )}
          </div>

          {/* Markaziy hover play ikonka */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
            <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>

          {/* Pastki qism: Ko'rishlar yoki reyting */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-gray-300 font-medium z-10 pointer-events-none">
            {movie.year ? (
              <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{movie.year}</span>
            ) : <span />}
            {movie.views > 0 && (
              <span className="flex items-center gap-1 text-[9px] text-gray-400">
                <Eye className="w-2.5 h-2.5 text-gray-400" />
                {movie.views > 1000 ? `${(movie.views / 1000).toFixed(1)}k` : movie.views}
              </span>
            )}
          </div>
        </div>

        {/* Kino nomi va qisqacha ma'lumot */}
        <div className="pt-1.5 px-0.5">
          <h3 className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-red-400 transition-colors">
            {displayTitle(movie)}
          </h3>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">
            {movie.genre ? movie.genre.split(',')[0] : 'Kino'}
          </p>
        </div>
      </motion.div>
    );
  }, [favCodes, toggleFavorite]);

  // Gorizontal qator (Row)
  const MovieRow = ({ title, list, isBig = false, badge }) => (
    <section className="mt-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h2>
          {badge && (
            <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="flex overflow-x-auto gap-3 px-4 pb-2 snap-x no-scrollbar">
        {list.map((m, idx) => (
          <MovieCard key={m._id || m.code} movie={m} index={idx} isBig={isBig} />
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col justify-between pb-20 font-sans selection:bg-red-600 selection:text-white">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#090a0f]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div 
            onClick={() => { setActiveTab('home'); setSelectedCategory('Barchasi'); }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-700 to-red-500 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading text-xl font-black tracking-tighter text-white">
              FILM<span className="text-red-500">X</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(activeTab === 'search' ? 'home' : 'search');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 active:scale-95 transition-all"
              aria-label="Qidiruv"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════ ASOSIY KONTENT ═══════════════════ */}
      <main className="flex-1 pt-14">
        {loading ? (
          <div className="p-4 max-w-5xl mx-auto space-y-6">
            <div className="w-full h-72 sm:h-96 rounded-3xl bg-zinc-900/80 animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-32 sm:w-40 aspect-[2/3] bg-zinc-900/70 rounded-2xl animate-pulse flex-none" />
              ))}
            </div>
          </div>
        ) : activeTab === 'search' ? (
          /* ═════════ QIDIRUV TABI ═════════ */
          <div className="px-4 py-4 max-w-5xl mx-auto min-h-[85vh]">
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Kino nomi yoki kodini yozing (masalan: 1025)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/15 rounded-2xl py-3 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!debouncedSearch ? (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  🔥 Ommabop janrlar
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {genres.slice(0, 12).map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        triggerHaptic('light');
                        setSearch(genre);
                      }}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-200 active:scale-95 transition-all hover:bg-white/10"
                    >
                      {getGenreEmoji(genre)} {genre}
                    </button>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-red-950/20 to-zinc-900 border border-red-900/20 rounded-2xl p-4 text-center">
                  <Sparkles className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">Tezkor topish</h4>
                  <p className="text-xs text-gray-400">
                    Bot orqali kino ko'rish uchun uning raqamli kodini (masalan: <code>1001</code>) ham qidirishingiz mumkin.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">
                    {isSearchingServer ? 'Qidirilmoqda...' : `Natijalar: ${searchResults.length} ta`}
                  </h3>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-8">
                    {searchResults.map((m, idx) => (
                      <MovieCard key={m._id || m.code} movie={m} index={idx} />
                    ))}
                  </div>
                ) : !isSearchingServer ? (
                  <div className="py-20 text-center text-gray-500">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Bunday kino topilmadi</p>
                    <p className="text-xs text-gray-600 mt-1">Nomini boshqacha yozib yoki kodini tekshirib ko'ring</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : activeTab === 'favorites' ? (
          /* ═════════ SEVIMLILAR TABI ═════════ */
          <div className="px-4 py-4 max-w-5xl mx-auto min-h-[85vh]">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <h2 className="text-lg font-bold text-white">Sevimli kinolarim</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {favorites.length}
              </span>
            </div>

            {favorites.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-8">
                {favorites.map((m, idx) => (
                  <MovieCard key={m._id || m.code} movie={m} index={idx} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center text-gray-500 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <Heart className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-300">Hali hech qanday kino saqlamadingiz</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Yoqtirgan kinolaringizdagi yurakcha belgisini bosing va ular shu yerda saqlanadi.
                </p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="mt-5 px-6 py-2.5 rounded-full bg-red-600 text-white font-semibold text-xs active:scale-95 transition-all shadow-lg shadow-red-900/30"
                >
                  Katalogga o'tish
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'profile' ? (
          /* ═════════ PROFIL & VIP TABI ═════════ */
          <div className="px-4 py-4 max-w-xl mx-auto min-h-[85vh] space-y-4">
            {/* Foydalanuvchi kartasi */}
            <div className="p-4 rounded-3xl bg-zinc-900/80 border border-white/10 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {telegramUser?.first_name ? telegramUser.first_name[0].toUpperCase() : <UserIcon className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {telegramUser?.first_name || 'Mehmon'} {telegramUser?.last_name || ''}
                </h3>
                <p className="text-xs text-gray-400">
                  {telegramUser?.username ? `@${telegramUser.username}` : `ID: ${telegramUser?.id || '—'}`}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                Foydalanuvchi
              </span>
            </div>

            {/* VIP Status va taklif */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-red-950/40 via-zinc-900 to-zinc-900 border border-red-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h4 className="font-heading text-base font-bold text-white">VIP Imtiyozlari</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                VIP obuna bilan siz kinolarni to'g'ridan-to'g'ri telefoningizga cheklovsiz yuklab olishingiz va botdan reklamasiz foydalanishingiz mumkin.
              </p>

              <ul className="text-xs space-y-2 text-gray-300 mb-5">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-none" />
                  <span>Kinolarni yuklab olish va boshqalarga yuborish</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-none" />
                  <span>Kino ostida sharhlar qoldirish va baholash</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-none" />
                  <span>Reklamalarsiz va ustuvor tezlikda ishlash</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  const botName = botInfo.username || 'FilmXBot';
                  if (WebApp?.openTelegramLink) {
                    WebApp.openTelegramLink(`https://t.me/${botName}?start=vip`);
                  } else {
                    window.open(`https://t.me/${botName}?start=vip`, '_blank');
                  }
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-xs active:scale-95 transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-white" />
                VIP obuna haqida bilish
              </button>
            </div>

            {/* Aloqa va qo'llab-quvvatlash */}
            <div className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 space-y-2.5 text-xs">
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  const support = botInfo.supportUsername || 'sanjarbek_404';
                  if (WebApp?.openTelegramLink) {
                    WebApp.openTelegramLink(`https://t.me/${support}`);
                  } else {
                    window.open(`https://t.me/${support}`, '_blank');
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-red-400" />
                  <span>Admin bilan bog'lanish</span>
                </div>
                <span className="text-gray-500 text-[10px]">@{botInfo.supportUsername || 'sanjarbek_404'}</span>
              </div>

              <div 
                onClick={() => {
                  triggerHaptic('light');
                  const botName = botInfo.username || 'FilmXBot';
                  const shareUrl = `https://t.me/${botName}?start=${telegramUser?.id || ''}`;
                  if (navigator.share) {
                    navigator.share({ title: 'FilmXBot', url: shareUrl }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText?.(shareUrl);
                    setToast({ type: 'success', text: 'Do\'stlarga havola nusxalandi!' });
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  <span>Do'stlarni taklif qilish</span>
                </div>
                <span className="text-gray-500 text-[10px]">Ulashish</span>
              </div>
            </div>
          </div>
        ) : (
          /* ═════════ ASOSIY (HOME) TABI ═════════ */
          <div>
            {/* HERO CAROUSEL BANNER */}
            {featured && (
              <div className="relative w-full h-[52vh] sm:h-[60vh] max-h-[460px] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featured._id || featured.code}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedMovie(featured);
                    }}
                  >
                    {posterUrl(featured) ? (
                      <img
                        src={posterUrl(featured)}
                        alt={displayTitle(featured)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FallbackPoster title={featured.title} code={featured.code} genre={featured.genre} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/40 to-transparent" />
                  </motion.div>
                </AnimatePresence>

                {/* Banner ichidagi matn va tomosha tugmasi */}
                <div className="absolute bottom-4 left-0 right-0 px-4 max-w-5xl mx-auto z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow">
                      TOP TAVSIYA
                    </span>
                    {featured.genre && (
                      <span className="text-[11px] text-gray-300 font-medium">
                        {featured.genre.split(',')[0]}
                      </span>
                    )}
                  </div>

                  <h1 className="font-heading text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md mb-3 line-clamp-2">
                    {displayTitle(featured)}
                  </h1>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWatchMovie(featured);
                      }}
                      className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs active:scale-95 transition-transform flex items-center gap-2 shadow-xl hover:bg-gray-100"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      Tomosha qilish
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMovie(featured);
                      }}
                      className="px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/15"
                    >
                      Batafsil
                    </button>

                    <button
                      onClick={(e) => toggleFavorite(e, featured)}
                      className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white active:scale-90 transition-transform"
                      aria-label="Sevimli"
                    >
                      <Heart className={`w-4 h-4 ${favCodes.has(featured.code) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                  </div>

                  {/* Carousel indikatorlari */}
                  {featuredPool.length > 1 && (
                    <div className="flex items-center gap-1.5 mt-4">
                      {featuredPool.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeroIndex(idx);
                          }}
                          className={`h-1 rounded-full transition-all ${
                            heroIndex === idx ? 'w-6 bg-red-600' : 'w-1.5 bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KATEGORIYA CHIPLARI */}
            <div className="sticky top-14 z-30 bg-[#090a0f]/95 backdrop-blur-md py-2.5 border-b border-white/5">
              <div className="flex overflow-x-auto gap-2 px-4 max-w-5xl mx-auto no-scrollbar">
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedCategory(cat);
                    }}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {cat === 'Barchasi' ? '🎯 Barchasi' : `${getGenreEmoji(cat)} ${cat}`}
                  </button>
                ))}
              </div>
            </div>

            {/* KONTENT TARKIBI */}
            <div className="max-w-5xl mx-auto pb-10">
              {selectedCategory === 'Barchasi' ? (
                <>
                  <MovieRow title="🔥 Trendda (Top kinolar)" list={topMovies} isBig badge="TOP" />
                  <MovieRow title="✨ Yangi qo'shilganlar" list={newMovies} />

                  <section className="px-4 mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        🎬 Barcha kinolar katalogi
                      </h2>
                      <span className="text-xs text-gray-500 font-medium">
                        {movies.length} ta kino
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {movies.slice(0, visibleCount).map((movie, idx) => {
                        const isLast = idx === Math.min(visibleCount, movies.length) - 1;
                        return isLast ? (
                          <div ref={sentinelRef} key={movie._id || movie.code}>
                            <MovieCard movie={movie} index={idx} />
                          </div>
                        ) : (
                          <div key={movie._id || movie.code}>
                            <MovieCard movie={movie} index={idx} />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              ) : (
                /* Kategoriya bo'yicha saralangan ro'yxat */
                <section className="px-4 mt-6 min-h-[60vh]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {getGenreEmoji(selectedCategory)} {selectedCategory} kinolari
                    </h2>
                    <span className="text-xs text-gray-500">
                      {categoryMovies.length} ta
                    </span>
                  </div>

                  {categoryMovies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {categoryMovies.map((movie, idx) => (
                        <MovieCard key={movie._id || movie.code} movie={movie} index={idx} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-gray-500">
                      <Film className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Bu janrda hali kinolar qo'shilmagan</p>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════ KINO TAFSILOTLARI MODALI (DETAILS BOTTOM SHEET) ═══════════════════ */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal kartasi */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-lg bg-[#12141c] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[88vh] flex flex-col shadow-2xl z-10"
            >
              {/* Yopish tugmasi */}
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white active:scale-90 transition-all border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Rasm va header */}
              <div className="relative h-56 sm:h-64 w-full flex-none overflow-hidden bg-black">
                {posterUrl(selectedMovie) ? (
                  <img
                    src={posterUrl(selectedMovie)}
                    alt={displayTitle(selectedMovie)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FallbackPoster
                    title={selectedMovie.title}
                    code={selectedMovie.code}
                    genre={selectedMovie.genre}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141c] via-[#12141c]/40 to-transparent" />

                {/* Sarlavha poster ustida */}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-semibold text-red-400">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 flex items-center gap-1 text-white">
                      <Hash className="w-3 h-3 text-red-500" />
                      {selectedMovie.code}
                    </span>
                    {selectedMovie.year && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                        {selectedMovie.year}
                      </span>
                    )}
                    {selectedMovie.views > 0 && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-md text-gray-300 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {selectedMovie.views} ko'rildi
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-white leading-tight">
                    {displayTitle(selectedMovie)}
                  </h2>
                </div>
              </div>

              {/* Tafsilotlar va matn */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">
                {/* Janrlar chiplari */}
                {selectedMovie.genre && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMovie.genre.split(',').map((g) => {
                      const trimmed = g.trim();
                      return (
                        <span
                          key={trimmed}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-300"
                        >
                          {getGenreEmoji(trimmed)} {trimmed}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Tavsif */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Kino haqida
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {selectedMovie.description ||
                      "Ushbu kino haqida qisqacha ma'lumot mavjud emas. Tomosha qilish uchun pastdagi tugmani bosing."}
                  </p>
                </div>

                {/* Serial qismlari (agar qism aniqlansa) */}
                {episodeNumber(selectedMovie.title) && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                      <Tv className="w-3.5 h-3.5" />
                      <span>Serial formati</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Ushbu film serialning <b>{episodeNumber(selectedMovie.title)}-qismi</b> hisoblanadi.
                    </p>
                  </div>
                )}

                {/* Do'stlarga ulashish havolasi */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Kino kodi: <b className="text-white">{selectedMovie.code}</b></span>
                  <button
                    onClick={() => handleShare(selectedMovie)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Nusxalandi!' : 'Ulashish'}
                  </button>
                </div>
              </div>

              {/* Pastki harakat tugmalari */}
              <div className="p-4 border-t border-white/10 bg-[#090a0f] flex items-center gap-3">
                <button
                  onClick={() => handleWatchMovie(selectedMovie)}
                  disabled={sendingMovie}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-sm active:scale-98 transition-all shadow-xl shadow-red-900/40 flex items-center justify-center gap-2"
                >
                  {sendingMovie ? (
                    <span>Yuborilmoqda...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 fill-white" />
                      <span>Botda tomosha qilish</span>
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => toggleFavorite(e, selectedMovie)}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/15 text-white active:scale-95 transition-all"
                  aria-label="Sevimli"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favCodes.has(selectedMovie.code) ? 'fill-red-500 text-red-500' : 'text-gray-300'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════ TEPAGA QAYTISH TUGMASI ═══════════════════ */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-zinc-800/90 border border-white/15 text-white shadow-xl backdrop-blur-md active:scale-90 transition-transform"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══════════════════ TOAST BILDIRISHNOMA ═══════════════════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-800/95 border border-white/20 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-semibold text-white max-w-[90vw] truncate"
          >
            {toast.type === 'success' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-none" />
            ) : toast.type === 'error' ? (
              <X className="w-3.5 h-3.5 text-red-400 flex-none" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-none" />
            )}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════ PASTKI NAVIGATSIYA (BOTTOM NAV) ═══════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/90 backdrop-blur-2xl border-t border-white/10 safe-bottom">
        <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-between">
          {[
            { id: 'home', label: 'Asosiy', icon: Home },
            { id: 'search', label: 'Qidiruv', icon: Compass },
            { id: 'favorites', label: 'Sevimlilar', icon: Heart, badge: favorites.length },
            { id: 'profile', label: 'Profil', icon: UserIcon },
          ].map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(id);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative ${
                  isActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
