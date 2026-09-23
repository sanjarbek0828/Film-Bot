import React from 'react';
import { Film, Search } from 'lucide-react';
import { triggerHaptic } from '../utils/helpers.js';

export const Header = ({ activeTab, onToggleSearch, onHome }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#090a0f]/80 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div
          onClick={() => {
            triggerHaptic('light');
            if (onHome) onHome();
          }}
          className="flex items-center gap-2 cursor-pointer select-none"
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
              if (onToggleSearch) onToggleSearch();
            }}
            className={`p-2 rounded-xl border border-white/10 active:scale-95 transition-all ${
              activeTab === 'search'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
            aria-label="Qidiruv"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
