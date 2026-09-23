import React from 'react';
import { motion } from 'framer-motion';
import { Home, Compass, Heart, User as UserIcon } from 'lucide-react';
import { triggerHaptic } from '../utils/helpers.js';

export const BottomNav = ({ activeTab, onTabChange, favCount = 0 }) => {
  const tabs = [
    { id: 'home', label: 'Asosiy', icon: Home },
    { id: 'search', label: 'Qidiruv', icon: Compass },
    { id: 'favorites', label: 'Sevimlilar', icon: Heart, badge: favCount },
    { id: 'profile', label: 'Profil', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/90 backdrop-blur-2xl border-t border-white/10 safe-bottom">
      <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-between">
        {tabs.map(({ id, label, icon: Icon, badge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                triggerHaptic('light');
                onTabChange(id);
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
  );
};

export default BottomNav;
