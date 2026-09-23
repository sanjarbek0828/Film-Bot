import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Eye, Tv, Share2, Check, Send, Heart } from 'lucide-react';
import { displayTitle, posterUrl, getGenreEmoji, episodeNumber } from '../utils/helpers.js';
import FallbackPoster from './FallbackPoster.jsx';

export const MovieModal = ({
  movie,
  onClose,
  onWatch,
  onToggleFav,
  isFav = false,
  sending = false,
  onShare,
  copied = false,
}) => {
  if (!movie) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white active:scale-90 transition-all border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Rasm va header */}
          <div className="relative h-56 sm:h-64 w-full flex-none overflow-hidden bg-black">
            {posterUrl(movie) ? (
              <img
                src={posterUrl(movie)}
                alt={displayTitle(movie)}
                className="w-full h-full object-cover"
              />
            ) : (
              <FallbackPoster
                title={movie.title}
                code={movie.code}
                genre={movie.genre}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12141c] via-[#12141c]/40 to-transparent" />

            {/* Sarlavha poster ustida */}
            <div className="absolute bottom-3 left-4 right-4">
              <div className="flex items-center gap-2 mb-1 text-[11px] font-semibold text-red-400">
                <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 flex items-center gap-1 text-white">
                  <Hash className="w-3 h-3 text-red-500" />
                  {movie.code}
                </span>
                {movie.year && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                    {movie.year}
                  </span>
                )}
                {movie.views > 0 && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-md text-gray-300 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {movie.views} ko'rildi
                  </span>
                )}
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white leading-tight">
                {displayTitle(movie)}
              </h2>
            </div>
          </div>

          {/* Tafsilotlar va matn */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">
            {/* Janrlar chiplari */}
            {movie.genre && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genre.split(',').map((g) => {
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
                {movie.description ||
                  "Ushbu kino haqida qisqacha ma'lumot mavjud emas. Tomosha qilish uchun pastdagi tugmani bosing."}
              </p>
            </div>

            {/* Serial qismlari (agar qism aniqlansa) */}
            {episodeNumber(movie.title) && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Serial formati</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Ushbu film serialning <b>{episodeNumber(movie.title)}-qismi</b> hisoblanadi.
                </p>
              </div>
            )}

            {/* Do'stlarga ulashish havolasi */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span>Kino kodi: <b className="text-white">{movie.code}</b></span>
              <button
                onClick={() => onShare && onShare(movie)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? 'Nusxalandi!' : 'Ulashish'}
              </button>
            </div>
          </div>

          {/* Pastki harakat tugmalari */}
          <div className="p-4 border-t border-white/10 bg-[#090a0f] flex items-center gap-3">
            <button
              onClick={() => onWatch && onWatch(movie)}
              disabled={sending}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-sm active:scale-98 transition-all shadow-xl shadow-red-900/40 flex items-center justify-center gap-2"
            >
              {sending ? (
                <span>Yuborilmoqda...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 fill-white" />
                  <span>Botda tomosha qilish</span>
                </>
              )}
            </button>

            <button
              onClick={(e) => onToggleFav && onToggleFav(e, movie)}
              className="p-3.5 rounded-2xl bg-white/5 border border-white/15 text-white active:scale-95 transition-all"
              aria-label="Sevimli"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFav ? 'fill-red-500 text-red-500' : 'text-gray-300'
                }`}
              />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MovieModal;
