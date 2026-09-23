import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart } from 'lucide-react';
import { displayTitle, posterUrl, triggerHaptic } from '../utils/helpers.js';
import FallbackPoster from './FallbackPoster.jsx';

export const HeroCarousel = ({
  movies = [],
  heroIndex = 0,
  onIndexChange,
  onSelectMovie,
  onWatchMovie,
  onToggleFav,
  favCodes = new Set(),
}) => {
  const featured = movies[heroIndex] || movies[0];

  useEffect(() => {
    if (!movies || movies.length <= 1) return;
    const interval = setInterval(() => {
      onIndexChange((prev) => (prev + 1) % movies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [movies, onIndexChange]);

  if (!featured) return null;

  return (
    <div className="relative h-96 sm:h-[420px] w-full overflow-hidden bg-black select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={featured._id || featured.code || heroIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            triggerHaptic('light');
            onSelectMovie(featured);
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
              onWatchMovie(featured);
            }}
            className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs active:scale-95 transition-transform flex items-center gap-2 shadow-xl hover:bg-gray-100"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            Tomosha qilish
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectMovie(featured);
            }}
            className="px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/15"
          >
            Batafsil
          </button>

          <button
            onClick={(e) => onToggleFav(e, featured)}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white active:scale-90 transition-transform"
            aria-label="Sevimli"
          >
            <Heart
              className={`w-4 h-4 ${
                favCodes.has(featured.code) ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Carousel indikatorlari */}
        {movies.length > 1 && (
          <div className="flex items-center gap-1.5 mt-4">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(idx);
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
  );
};

export default HeroCarousel;
