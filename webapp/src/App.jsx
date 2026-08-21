import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, Hash, X, Home, Compass, Heart, ArrowUp } from 'lucide-react';

const WebApp = window.Telegram?.WebApp;

// initData imzosini har bir himoyalangan so'rovga qo'shamiz
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Telegram-Init-Data': WebApp?.initData || '',
});

const GENRE_EMOJI = {
  jangari: '💥', boevik: '💥', komediya: '😂', fantastika: '🛸',
  qorqinchli: '👻', dahshat: '👻', drama: '🎭', melodrama: '💔',
  multfilm: '🦁', animatsiya: '🦁', sarguzasht: '🗺️', kriminal: '🕵️',
  triller: '🔪', tarixiy: '📜',
};

const getGenreEmoji = (genre = '') => {
  const g = genre.toLowerCase();
  for (const key of Object.keys(GENRE_EMOJI)) if (g.includes(key)) return GENRE_EMOJI[key];
  return '🍿';
};

const displayTitle = (movie) =>
  movie.title && !/^Kino #\d+$/i.test(movie.title) ? movie.title : `Kino #${movie.code}`;

const posterUrl = (movie) =>
  movie.poster && movie.poster.startsWith('http') ? movie.poster : `/api/image/${movie.poster}`;

const episodeNumber = (title = '') => {
  const match = title.match(/-\s*(\d+)\s*-?\s*qism/i);
  return match ? match[1] : null;
};

export default function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [toast, setToast] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(18);

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favs') || '[]'); } catch { return []; }
  });
  const favCodes = useMemo(() => new Set(favorites.map((f) => f.code)), [favorites]);

  const userId = WebApp?.initDataUnsafe?.user?.id;
  const observerRef = useRef();

  // ═══ Telegram init ═══
  useEffect(() => {
    if (!WebApp) return;
    WebApp.ready();
    WebApp.expand();
    try { WebApp.setHeaderColor?.('#000000'); WebApp.setBackgroundColor?.('#000000'); } catch { /* eski versiyalar */ }
  }, []);

  // ═══ Ma'lumotlarni yuklash (bitta katta sahifa — WebApp klient tomonda filtrlaydi) ═══
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [moviesRes, genresRes] = await Promise.all([
          fetch('/api/movies?limit=100&sort=new').then((r) => r.json()),
          fetch('/api/genres').then((r) => r.json()).catch(() => []),
        ]);
        if (cancelled) return;
        setMovies(Array.isArray(moviesRes?.items) ? moviesRes.items : []);
        setGenres(Array.isArray(genresRes) ? genresRes.map((g) => g.name) : []);
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ═══ Server bilan sinxron sevimlilar (imzo bilan) ═══
  useEffect(() => {
    if (!userId || !WebApp?.initData) return;
    fetch('/api/favorites', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data) && data.length) setFavorites(data); })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('favs', JSON.stringify(favorites));
  }, [favorites]);

  // ═══ Debounced qidiruv ═══
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => setVisibleCount(18), [debouncedSearch, selectedCategory, activeTab]);
           
               
  // ═══ Scroll ═══
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    WebApp?.HapticFeedback?.impactOccurred('light');
  };

  // ═══ Kino tanlash (botga yuborish) ═══
  const handleSelect = useCallback((movie) => {
    WebApp?.HapticFeedback?.impactOccurred('medium');
    setToast(String(movie.code));
    try {
      WebApp?.sendData(JSON.stringify({ action: 'play_movie', code: movie.code }));
    } catch { /* noop */ }
    setTimeout(() => { setToast(''); WebApp?.close?.(); }, 1000);
  }, []);

  // ═══ Sevimli toggle (optimistik + server) ═══
  const toggleFavorite = useCallback((e, movie) => {
    e.stopPropagation();
    WebApp?.HapticFeedback?.impactOccurred('light');
    setFavorites((prev) =>
      prev.some((f) => f.code === movie.code)
        ? prev.filter((f) => f.code !== movie.code)
        : [...prev, movie]
    );
    if (userId && movie._id && WebApp?.initData) {
      fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ movieId: movie._id }),
      }).catch(() => {});
    }
  }, [userId]);

  // ═══ Hosilalar (derived) ═══
  const newMovies = useMemo(() => movies.slice(0, 18), [movies]);
  const topMovies = useMemo(
    () => [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 18),
    [movies]
  );
  const featuredPool = useMemo(() => topMovies.slice(0, 5), [topMovies]);
  const featured = featuredPool[heroIndex] || null;

  useEffect(() => {
    if (featuredPool.length < 2) return;
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % featuredPool.length), 5000);
    return () => clearInterval(id);
  }, [featuredPool.length]);

  const categoryList = useMemo(() => ['Barchasi', ...genres].slice(0, 16), [genres]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch) return [];
    return movies.filter(
      (m) =>
        (m.title && m.title.toLowerCase().includes(debouncedSearch)) ||
        String(m.code).includes(debouncedSearch)
    );
  }, [movies, debouncedSearch]);

  const categoryMovies = useMemo(() => {
    if (selectedCategory === 'Barchasi') return [];
    const term = selectedCategory.toLowerCase();
    return movies.filter((m) => m.genre && m.genre.toLowerCase().includes(term));
  }, [movies, selectedCategory]);

  // ═══ Infinite scroll ═══
  const sentinelRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((c) => c + 18);
    });
    if (node) observerRef.current.observe(node);
  }, []);

  // ═══ Kino kartasi ═══
  const MovieCard = useCallback(({ movie, index, big = false }) => {
    const episode = episodeNumber(movie.title);
    const isFav = favCodes.has(movie.code);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
        whileTap={{ scale: 0.95 }}
        className={`flex-none flex flex-col relative group cursor-pointer snap-start gap-1.5 ${big ? 'w-40 md:w-48' : 'w-32 md:w-40'}`}
        onClick={() => handleSelect(movie)}
      >
        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-white/10 bg-zinc-900 aspect-[2/3] w-full">
          <img
            src={posterUrl(movie)}
            alt={displayTitle(movie)}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.currentTarget.style.opacity = '0.15'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <button
            onClick={(e) => toggleFavorite(e, movie)}
            aria-label="Sevimli"
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 active:scale-90 transition-transform z-20"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <div className="bg-black/50 backdrop-blur-xl px-2 py-1 rounded-lg text-[10px] font-bold text-white/90 flex items-center gap-1 border border-white/20">
              <Hash className="w-3 h-3 text-red-500" />{movie.code}
            </div>
            {episode && (
              <div className="bg-red-600/90 backdrop-blur-xl px-2.5 py-1 rounded-lg text-[10px] font-black text-white border border-red-400/30">
                {episode}-QISM
              </div>
            )}
          </div>
        </div>
        <div className="px-1 pt-0.5">
          <h3 className="text-gray-100 text-sm font-medium truncate group-hover:text-red-400 transition-colors">
            {displayTitle(movie)}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
            {movie.year && <span>{movie.year}</span>}
            {movie.year && movie.genre && <span>•</span>}
            {movie.genre && <span className="truncate">{movie.genre.split(',')[0]}</span>}
          </div>
        </div>
      </motion.div>
    );
  }, [favCodes, handleSelect, toggleFavorite]);

  const Grid = ({ list }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-10">
      {list.slice(0, visibleCount).map((movie, idx) => {
        const isLast = idx === Math.min(visibleCount, list.length) - 1;
        const card = <MovieCard movie={movie} index={idx} />;
        return isLast ? <div ref={sentinelRef} key={movie._id || movie.code}>{card}</div>
                      : <div key={movie._id || movie.code}>{card}</div>;
      })}
    </div>
  );

  const Row = ({ title, list, big }) => (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-white px-4 mb-3">{title}</h2>
      <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {list.map((movie, idx) => <MovieCard key={movie._id || movie.code} movie={movie} index={idx} big={big} />)}
      </div>
    </section>
  );

  const searchMode = activeTab === 'search';

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-colors duration-300 ${searchMode ? 'bg-black/95 backdrop-blur-md' : 'bg-gradient-to-b from-black/80 to-transparent'} p-4`}>
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          {!searchMode && <h1 className="text-2xl font-extrabold text-red-600 tracking-tighter">FILMX</h1>}
          {searchMode && (
            <div className="relative flex items-center flex-1">
              <Search className="absolute left-3 w-5 h-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                inputMode="search"
                placeholder="Kod yoki nom bilan izlang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-2xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/30 transition-all placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 p-1 rounded-full bg-white/10">
                  <X className="w-4 h-4 text-white/80" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Skeleton */}
      {loading ? (
        <main className="pt-20 px-4 max-w-5xl mx-auto">
          <div className="w-full h-[55vh] bg-zinc-900 animate-pulse rounded-3xl mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-none w-32 md:w-40">
                <div className="aspect-[2/3] w-full bg-zinc-900 animate-pulse rounded-2xl" />
                <div className="w-3/4 h-3 bg-zinc-900 animate-pulse rounded mt-2" />
              </div>
            ))}
          </div>
        </main>
      ) : activeTab === 'favorites' ? (
        <main className="pt-24 px-4 max-w-5xl mx-auto min-h-screen">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Sevimli kinolarim
          </h2>
          {favorites.length > 0 ? <Grid list={favorites} /> : (
            <div className="py-20 text-center text-gray-500">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Hali hech narsa saqlamadingiz</p>
            </div>
          )}
        </main>
      ) : searchMode ? (
        <main className="pt-24 px-4 max-w-5xl mx-auto min-h-screen">
          {!debouncedSearch ? (
            <div>
              <h2 className="text-xl font-bold mb-4">🔥 Kategoriyalar</h2>
              <div className="flex flex-wrap gap-2">
                {categoryList.filter((c) => c !== 'Barchasi').map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSearch(genre)}
                    className="px-4 py-2 bg-white/10 rounded-full text-sm font-bold text-gray-200 border border-white/10 active:scale-95 transition-all"
                  >
                    {getGenreEmoji(genre)} {genre}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-4 text-gray-300">Natijalar: {searchResults.length} ta</h2>
              {searchResults.length > 0 ? <Grid list={searchResults} /> : (
                <div className="py-20 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Hech narsa topilmadi</p>
                </div>
              )}
            </>
          )}
        </main>
      ) : (
        <main className="pb-10">
          {featured && (
            <div className="relative w-full h-[58vh] md:h-[70vh] flex items-end overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={featured._id || featured.code}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0"
                >
                  <img src={posterUrl(featured)} alt={displayTitle(featured)} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </motion.div>
              </AnimatePresence>
              <div className="relative z-10 p-6 md:p-12 w-full max-w-5xl mx-auto">
                <span className="inline-block bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider mb-3">TOP TAVSIYA</span>
                <h1 className="text-3xl md:text-5xl font-black mb-5 drop-shadow-lg leading-tight">{displayTitle(featured)}</h1>
                <button
                  onClick={() => handleSelect(featured)}
                  className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full active:scale-95 transition-transform font-bold text-sm md:text-base"
                >
                  <Play className="w-5 h-5 fill-black" /> Tomosha qilish
                </button>
              </div>
            </div>
          )}

          <div className="max-w-5xl mx-auto mt-4 space-y-6">
            {/* Kategoriya chiplar */}
            <div className="flex overflow-x-auto gap-2 px-4 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {categoryList.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedCategory(genre)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-bold border transition-all ${
                    selectedCategory === genre
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-white/5 text-gray-300 border-white/10'
                  }`}
                >
                  {genre === 'Barchasi' ? '🎯 Barchasi' : `${getGenreEmoji(genre)} ${genre}`}
                </button>
              ))}
            </div>

            {selectedCategory === 'Barchasi' ? (
              <>
                <Row title="Yangi qo'shilganlar" list={newMovies} />
                <Row title="Top kinolar (Trendda)" list={topMovies} big />
              </>
            ) : (
              <section className="px-4 min-h-screen">
                <h2 className="text-lg font-bold mb-4">{selectedCategory} kinolar</h2>
                {categoryMovies.length > 0 ? <Grid list={categoryMovies} /> : (
                  <p className="text-center text-gray-500 py-10 text-sm">Bu janrda hozircha kinolar yo'q</p>
                )}
              </section>
            )}
          </div>
        </main>
      )}

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 z-50 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl active:scale-95"
          >
            <ArrowUp className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-50 flex items-center gap-2"
          >
            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
              <Play className="w-3 h-3 fill-white" />
            </div>
            Kino tayyorlanmoqda...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full bg-black/85 backdrop-blur-xl border-t border-white/10 z-50 px-10 py-3 flex justify-between items-center text-[10px] font-bold text-gray-400">
        {[
          { id: 'home', label: 'ASOSIY', Icon: Home },
          { id: 'search', label: 'QIDIRUV', Icon: Compass },
          { id: 'favorites', label: 'SEVIMLILAR', Icon: Heart },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id !== 'search') setSearch(''); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === id ? 'text-red-500' : 'hover:text-gray-200'}`}
          >
            <Icon className="w-6 h-6" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <style>{`::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
