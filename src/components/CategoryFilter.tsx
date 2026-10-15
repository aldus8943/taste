'use client';

import React from 'react';
import { RestaurantCategory } from '@/types/restaurant';

interface CategoryFilterProps {
  categories: RestaurantCategory[];
  selectedCategory: RestaurantCategory;
  onSelectCategory: (category: RestaurantCategory) => void;
  categoryCounts: Record<RestaurantCategory, number>;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        const count = categoryCounts[cat] || 0;

        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1 ${
              isSelected
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <span>{cat}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                isSelected
                  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
