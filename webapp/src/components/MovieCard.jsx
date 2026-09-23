import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Hash, Eye, Play } from 'lucide-react';
import { displayTitle, posterUrl, episodeNumber, triggerHaptic } from '../utils/helpers.js';
import FallbackPoster from './FallbackPoster.jsx';

export const MovieCard = memo(({ movie, index = 0, isBig = false, isFav = false, onSelect, onToggleFav }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const episode = episodeNumber(movie.title);
  const poster = posterUrl(movie);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        triggerHaptic('light');
        if (onSelect) onSelect(movie);
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
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFav) onToggleFav(e, movie);
          }}
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

        {/* Pastki qism: Yil va ko'rishlar */}
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
});

export default MovieCard;
