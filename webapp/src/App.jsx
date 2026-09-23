import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, X, ArrowUp, Film, Sparkles, ShieldCheck, Heart, User as UserIcon, MessageCircle, HelpCircle
} from 'lucide-react';

import {
  WebApp,
  authHeaders,
  triggerHaptic,
  getGenreEmoji,
} from './utils/helpers.js';

import Header from './components/Header.jsx';
import HeroCarousel from './components/HeroCarousel.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieModal from './components/MovieModal.jsx';
import BottomNav from './components/BottomNav.jsx';

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
  const [visibleCount, setVisibleCount] = useState(24);
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

    const localMatches = movies.filter((m) => {
      const titleMatch = m.title && m.title.toLowerCase().includes(debouncedSearch);
      const codeMatch = String(m.code).includes(debouncedSearch);
      return titleMatch || codeMatch;
    });

    setSearchResults(localMatches);

    let active = true;
    setIsSearchingServer(true);
    fetch(`/api/movies?search=${encodeURIComponent(debouncedSearch)}&limit=40`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((res) => {
        if (!active) return;
        const serverItems = Array.isArray(res?.items) ? res.items : [];
        const combined = [...localMatches];
        serverItems.forEach((si) => {
          if (!combined.some((c) => c.code === si.code)) {
            combined.push(si);
          }
        });
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

  // Scroll to top kuzatuvchisi
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

  // Toast bildirishnoma ko'rsatish
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Sevimlilar holatini o'zgartirish
  const toggleFavorite = useCallback(
    async (e, movie) => {
      if (e) e.stopPropagation();
      triggerHaptic('medium');

      const isFav = favCodes.has(movie.code);
      let updated;

      if (isFav) {
        updated = favorites.filter((f) => f.code !== movie.code);
        showToast(`💔 "${movie.title}" sevimlilardan olib tashlandi`);
      } else {
        updated = [movie, ...favorites];
        showToast(`❤️ "${movie.title}" sevimlilarga qo'shildi`);
      }

      setFavorites(updated);

      if (movie._id && telegramUser?.id && WebApp?.initData) {
        try {
          await fetch('/api/favorites/toggle', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ movieId: movie._id }),
          });
        } catch (err) {
          console.error('Toggle favorite server error:', err);
        }
      }
    },
    [favCodes, favorites, telegramUser?.id, showToast]
  );

  // Kinoni tomosha qilish (Bot chatiga yuborish)
  const handleWatchMovie = useCallback(
    async (movie) => {
      if (!movie) return;
      triggerHaptic('success');
      setSendingMovie(true);

      if (telegramUser?.id && WebApp?.initData) {
        try {
          const res = await fetch('/api/movies/play', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ code: movie.code }),
          });

          if (res.ok) {
            showToast(`🎬 "${movie.title}" botingizga yuborildi!`);
            setTimeout(() => {
              WebApp?.close();
            }, 700);
            return;
          }
        } catch (err) {
          console.error('Watch movie API error:', err);
        } finally {
          setSendingMovie(false);
        }
      }

      if (WebApp?.sendData) {
        WebApp.sendData(JSON.stringify({ action: 'play_movie', code: movie.code }));
        showToast('🎬 Kino botga yuborildi!');
        setTimeout(() => WebApp?.close(), 500);
      } else {
        const botName = botInfo.username || 'FilmXBot';
        const url = `https://t.me/${botName}?start=${movie.code}`;
        window.open(url, '_blank');
      }
      setSendingMovie(false);
    },
    [telegramUser?.id, botInfo.username, showToast]
  );

  // Kinoni ulashish
  const handleShare = useCallback(
    (movie) => {
      if (!movie) return;
      triggerHaptic('light');

      const botName = botInfo.username || 'FilmXBot';
      const shareUrl = `https://t.me/${botName}?start=${movie.code}`;
      const shareText = `🎬 ${movie.title}\n\nFilmX orqali bepul tomosha qiling:`;

      if (WebApp?.openTelegramLink) {
        const tgShare = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        WebApp.openTelegramLink(tgShare);
      } else if (navigator.share) {
        navigator.share({ title: movie.title, text: shareText, url: shareUrl }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(shareUrl);
        setCopiedLink(true);
        showToast('🔗 Havola nusxalandi!');
        setTimeout(() => setCopiedLink(false), 2500);
      }
    },
    [botInfo.username, showToast]
  );

  // Kategoriya ro'yxati
  const categoryList = useMemo(() => ['Barchasi', ...genres], [genres]);

  // Saralangan kinolar
  const topMovies = useMemo(() => [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10), [movies]);
  const newMovies = useMemo(() => movies.slice(0, 10), [movies]);

  // Kategoriya bo'yicha filter
  const categoryMovies = useMemo(() => {
    if (selectedCategory === 'Barchasi') return movies;
    return movies.filter((m) => m.genre && m.genre.toLowerCase().includes(selectedCategory.toLowerCase()));
  }, [movies, selectedCategory]);

  // Hero carousel uchun tavsiya etilgan kinolar
  const featuredPool = useMemo(() => {
    const pool = topMovies.length > 0 ? topMovies.slice(0, 6) : movies.slice(0, 6);
    return pool;
  }, [topMovies, movies]);

  // Infinite scroll kuzatuvchisi
  const sentinelRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && visibleCount < movies.length) {
          setVisibleCount((prev) => prev + 18);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, visibleCount, movies.length]
  );

  // Gorizontal kino qatori (Row)
  const MovieRow = ({ title, list, isBig = false, badge }) => {
    if (!list || list.length === 0) return null;
    return (
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
            <MovieCard
              key={m._id || m.code}
              movie={m}
              index={idx}
              isBig={isBig}
              isFav={favCodes.has(m.code)}
              onSelect={setSelectedMovie}
              onToggleFav={toggleFavorite}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col justify-between pb-20 font-sans selection:bg-red-600 selection:text-white">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <Header
        activeTab={activeTab}
        onToggleSearch={() => setActiveTab(activeTab === 'search' ? 'home' : 'search')}
        onHome={() => {
          setActiveTab('home');
          setSelectedCategory('Barchasi');
        }}
      />

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
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/90 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Janr teglari */}
            {!search && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Mashhur janrlar:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 10).map((g) => (
                    <button
                      key={g}
                      onClick={() => setSearch(g)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      {getGenreEmoji(g)} {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Natijalar */}
            {search ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-400">
                    Qidiruv natijalari: <b className="text-white">{searchResults.length}</b> ta
                  </h3>
                  {isSearchingServer && (
                    <span className="text-xs text-red-400 animate-pulse">Qidirilmoqda...</span>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {searchResults.map((m, idx) => (
                      <MovieCard
                        key={m._id || m.code}
                        movie={m}
                        index={idx}
                        isFav={favCodes.has(m.code)}
                        onSelect={setSelectedMovie}
                        onToggleFav={toggleFavorite}
                      />
                    ))}
                  </div>
                ) : !isSearchingServer ? (
                  <div className="py-20 text-center text-gray-500">
                    <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
                    <p className="text-base font-semibold text-gray-300">Bunday kino topilmadi</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Kino kodi yoki nomini to'g'ri yozganingizga ishonch hosil qiling.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Kino nomi yoki uning 4 xonali kodini kiriting</p>
              </div>
            )}
          </div>
        ) : activeTab === 'favorites' ? (
          /* ═════════ SEVIMLILAR TABI ═════════ */
          <div className="px-4 py-4 max-w-5xl mx-auto min-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                Sevimlilar ro'yxati
              </h2>
              <span className="text-xs text-gray-400 font-medium">
                {favorites.length} ta kino
              </span>
            </div>

            {favorites.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {favorites.map((m, idx) => (
                  <MovieCard
                    key={m._id || m.code}
                    movie={m}
                    index={idx}
                    isFav={true}
                    onSelect={setSelectedMovie}
                    onToggleFav={toggleFavorite}
                  />
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
                <span>💎 VIP Obunani Faollashtirish</span>
              </button>
            </div>

            {/* Aloqa va qo'llab-quvvatlash */}
            <div className="p-4 rounded-3xl bg-zinc-900/60 border border-white/5 space-y-3">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Yordam & Kanal</h5>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    const supportUser = botInfo.supportUsername || 'sanjarbek_404';
                    if (WebApp?.openTelegramLink) {
                      WebApp.openTelegramLink(`https://t.me/${supportUser}`);
                    } else {
                      window.open(`https://t.me/${supportUser}`, '_blank');
                    }
                  }}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left text-xs font-semibold text-gray-200 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <HelpCircle className="w-4 h-4 text-red-400" />
                  <span>Qo'llab-quvvatlash</span>
                </button>

                <button
                  onClick={() => {
                    const botName = botInfo.username || 'FilmXBot';
                    if (WebApp?.openTelegramLink) {
                      WebApp.openTelegramLink(`https://t.me/${botName}`);
                    } else {
                      window.open(`https://t.me/${botName}`, '_blank');
                    }
                  }}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left text-xs font-semibold text-gray-200 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-amber-400" />
                  <span>Botga o'tish</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ═════════ ASOSIY HOME TABI ═════════ */
          <div>
            {/* HERO BANNER */}
            {featuredPool.length > 0 && selectedCategory === 'Barchasi' && (
              <HeroCarousel
                movies={featuredPool}
                heroIndex={heroIndex}
                onIndexChange={setHeroIndex}
                onSelectMovie={setSelectedMovie}
                onWatchMovie={handleWatchMovie}
                onToggleFav={toggleFavorite}
                favCodes={favCodes}
              />
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
                            <MovieCard
                              movie={movie}
                              index={idx}
                              isFav={favCodes.has(movie.code)}
                              onSelect={setSelectedMovie}
                              onToggleFav={toggleFavorite}
                            />
                          </div>
                        ) : (
                          <div key={movie._id || movie.code}>
                            <MovieCard
                              movie={movie}
                              index={idx}
                              isFav={favCodes.has(movie.code)}
                              onSelect={setSelectedMovie}
                              onToggleFav={toggleFavorite}
                            />
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
                        <MovieCard
                          key={movie._id || movie.code}
                          movie={movie}
                          index={idx}
                          isFav={favCodes.has(movie.code)}
                          onSelect={setSelectedMovie}
                          onToggleFav={toggleFavorite}
                        />
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

      {/* ═══════════════════ KINO TAFSILOTLARI MODALI ═══════════════════ */}
      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onWatch={handleWatchMovie}
        onToggleFav={toggleFavorite}
        isFav={selectedMovie ? favCodes.has(selectedMovie.code) : false}
        sending={sendingMovie}
        onShare={handleShare}
        copied={copiedLink}
      />

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
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════ PASTKI NAVIGATSIYA (BOTTOM NAV) ═══════════════════ */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        favCount={favorites.length}
      />
    </div>
  );
}
