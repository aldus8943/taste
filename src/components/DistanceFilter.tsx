'use client';

import React from 'react';
import { DistanceRadius } from '@/types/restaurant';

interface DistanceFilterProps {
  selectedRadius: DistanceRadius;
  onSelectRadius: (radius: DistanceRadius) => void;
}

const RADIUS_OPTIONS: { label: string; value: DistanceRadius; badge: string }[] = [
  { label: '500m', badge: '도보 7분', value: 500 },
  { label: '1km', badge: '도보 15분', value: 1000 },
  { label: '3km', badge: '차량 5분', value: 3000 },
];

export default function DistanceFilter({
  selectedRadius,
  onSelectRadius,
}: DistanceFilterProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
      {RADIUS_OPTIONS.map((opt) => {
        const isSelected = selectedRadius === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelectRadius(opt.value)}
            className={`py-2 px-2 rounded-lg transition-all text-center flex flex-col items-center justify-center ${
              isSelected
                ? 'bg-white text-emerald-700 shadow-xs font-bold ring-1 ring-emerald-500/20'
                : 'text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-200/60'
            }`}
          >
            <span className="text-xs">{opt.label} 이내</span>
            <span
              className={`text-[10px] mt-0.5 ${
                isSelected ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {opt.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
