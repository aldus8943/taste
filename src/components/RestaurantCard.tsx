'use client';

import React from 'react';
import { MapPin, Phone, ChevronRight, Building } from 'lucide-react';
import { Restaurant } from '@/types/restaurant';
import { formatDistance } from '@/utils/distance';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distanceInMeters: number | null;
  onSelect: (restaurant: Restaurant) => void;
}

export default function RestaurantCard({
  restaurant,
  distanceInMeters,
  onSelect,
}: RestaurantCardProps) {
  return (
    <article
      onClick={() => onSelect(restaurant)}
      className="group relative bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer active:scale-[0.99] flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          {/* 상단 상호명 & 카테고리 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-md">
                {restaurant.category}
              </span>
              {restaurant.subCategory && (
                <span className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                  {restaurant.subCategory}
                </span>
              )}
              {restaurant.isSample ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                  샘플 데이터
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                  공공데이터
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
              {restaurant.name}
            </h3>
          </div>

          {/* 내 위치 기준 직선거리 */}
          <div className="shrink-0 text-right">
            {restaurant.hasCoordinates && distanceInMeters !== null ? (
              <span className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700">
                직선거리 {formatDistance(distanceInMeters)}
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-medium">
                좌표 미제공
              </span>
            )}
          </div>
        </div>

        {/* 도로명 주소 & 층수 */}
        <div className="mt-2.5 space-y-1 text-xs text-gray-600">
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{restaurant.roadAddress}</span>
          </div>
          {restaurant.floor && (
            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] pl-5">
              <Building className="w-3 h-3 text-gray-400" />
              <span>{restaurant.floor}</span>
              {restaurant.buildingName && <span>({restaurant.buildingName})</span>}
            </div>
          )}
        </div>
      </div>

      {/* 하단 전화번호 & 공공데이터 상태 */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="truncate max-w-[150px]">{restaurant.phone || '전화번호 미제공'}</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>상세보기</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </article>
  );
}
