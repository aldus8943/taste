'use client';

import React, { useState, useMemo } from 'react';
import { Restaurant } from '@/types/restaurant';
import RestaurantCard from './RestaurantCard';
import { ArrowUpDown, UtensilsCrossed, RotateCcw } from 'lucide-react';

interface RestaurantWithDistance {
  restaurant: Restaurant;
  distance: number | null;
}

interface RestaurantListProps {
  items: RestaurantWithDistance[];
  totalCount?: number;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export default function RestaurantList({
  items,
  totalCount,
  onSelectRestaurant,
  onResetFilters,
  hasActiveFilters,
}: RestaurantListProps) {
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      }
      return a.restaurant.name.localeCompare(b.restaurant.name, 'ko');
    });
  }, [items, sortBy]);

  return (
    <div className="space-y-3">
      {/* 목록 헤더: 총 결과 수 및 정렬 */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-600">
        <div>
          총 <span className="font-bold text-gray-900">{totalCount ?? items.length}</span>곳의
          음식점
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" />
          <button
            onClick={() => setSortBy('distance')}
            className={`font-medium transition-colors ${
              sortBy === 'distance'
                ? 'text-emerald-700 font-bold underline underline-offset-4'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            거리순
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setSortBy('name')}
            className={`font-medium transition-colors ${
              sortBy === 'name'
                ? 'text-emerald-700 font-bold underline underline-offset-4'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            이름순
          </button>
        </div>
      </div>

      {/* 목록 본문 또는 빈 화면 */}
      {sortedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedItems.map(({ restaurant, distance }) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              distanceInMeters={distance}
              onSelect={onSelectRestaurant}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 px-4 bg-white rounded-2xl border border-gray-200 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">
              검색 조건에 맞는 음식점이 없습니다
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              반경을 넓히거나 다른 검색어·업종을 선택해 보세요.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>검색 필터 초기화</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
