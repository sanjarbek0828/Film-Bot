import React from 'react';
import { Film } from 'lucide-react';

export const FallbackPoster = ({ title, code, genre }) => (
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

export default FallbackPoster;
