'use client';

import React from 'react';
import { Map, List } from 'lucide-react';

interface ViewToggleProps {
  currentView: 'list' | 'map';
  onToggle: (view: 'list' | 'map') => void;
}

export default function ViewToggle({
  currentView,
  onToggle,
}: ViewToggleProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-gray-900/90 text-white backdrop-blur-md px-1.5 py-1.5 rounded-full shadow-2xl border border-gray-700/60 flex items-center gap-1">
        <button
          onClick={() => onToggle('list')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            currentView === 'list'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>목록 보기</span>
        </button>

        <button
          onClick={() => onToggle('map')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            currentView === 'map'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>지도 보기</span>
        </button>
      </div>
    </div>
  );
}
