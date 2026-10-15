'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Restaurant, UserLocation, DistanceRadius } from '@/types/restaurant';
import { formatDistance } from '@/utils/distance';

interface RestaurantWithDistance {
  restaurant: Restaurant;
  distance: number | null;
}

interface MapViewProps {
  currentLocation: UserLocation;
  restaurants: RestaurantWithDistance[];
  selectedRadius: DistanceRadius;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

export default function MapView({
  currentLocation,
  restaurants,
  selectedRadius,
  onSelectRestaurant,
}: MapViewProps) {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // 현재 선택된 핀의 음식점 찾기
  const activeRestaurantWithDist = useMemo(() => {
    return (
      restaurants.find((item) => item.restaurant.id === selectedPinId) || null
    );
  }, [restaurants, selectedPinId]);

  // 지도 영역의 위경도 범위 계산 (경계 박스: 중심 위치 기준 약 +-0.02도, 약 2.2km 반경 커버)
  // 500m, 1km, 3km에 맞춰 스케일 조정
  const mapSpan = useMemo(() => {
    if (selectedRadius === 500) return 0.009; // 약 1km 영역
    if (selectedRadius === 1000) return 0.016; // 약 1.8km 영역
    if (selectedRadius === 3000) return 0.045; // 약 5km 영역
    return 0.025; // 기본 반경
  }, [selectedRadius]);

  // 위경도 좌표를 지도 SVG % 좌표(0% ~ 100%)로 변환
  const getCoordinatesPercent = (lat: number, lon: number) => {
    // 위도는 위로 갈수록 증가 (Y축은 아래로 갈수록 증가하므로 반전)
    const yPercent = 50 - ((lat - currentLocation.latitude) / mapSpan) * 50;
    // 경도는 오른쪽으로 갈수록 증가
    const xPercent = 50 + ((lon - currentLocation.longitude) / mapSpan) * 50;

    // 화면 밖으로 벗어나는 것 1% ~ 99% 클램핑
    const clampedX = Math.max(3, Math.min(97, xPercent));
    const clampedY = Math.max(3, Math.min(97, yPercent));

    return { x: clampedX, y: clampedY };
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] bg-slate-100 rounded-2xl overflow-hidden border border-gray-300 shadow-inner flex flex-col">
      {/* 상단 안내 바 */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs pointer-events-auto flex items-center gap-2 text-xs">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800">
            {selectedRadius > 0
              ? `${formatDistance(selectedRadius)} 반경 내 (${restaurants.length}개소)`
              : `전체 반경 (${restaurants.length}개소)`}
          </span>
        </div>

        <div className="bg-emerald-700/90 text-white backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-xs">
          1단계 인터랙티브 맵
        </div>
      </div>

      {/* 지도 메인 캔버스 영역 */}
      <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]">
        {/* 가상 도로망 및 격자 그리드 시각화 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-full border-b border-r border-gray-400/40" />
          {/* 가상 테헤란로 및 언주로 선 */}
          <div className="absolute top-[48%] left-0 right-0 h-2 bg-gray-400/30 transform -rotate-2" />
          <div className="absolute top-0 bottom-0 left-[51%] w-2 bg-gray-400/30 transform rotate-2" />
        </div>

        {/* 선택된 반경 원 (중심 기준 원형 범위) */}
        {selectedRadius > 0 && (
          <div
            className="absolute rounded-full border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{
              left: '50%',
              top: '50%',
              width: `${(selectedRadius / (mapSpan * 111000)) * 100}%`,
              height: `${(selectedRadius / (mapSpan * 111000)) * 100}%`,
              maxWidth: '92%',
              maxHeight: '92%',
            }}
          />
        )}

        {/* 내 현재 위치 마커 (지도 정중앙) */}
        <div
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: '50%', top: '50%' }}
        >
          {/* 펄스 애니메이션 */}
          <span className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping pointer-events-none" />
          <div className="w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 bg-blue-900/90 text-white text-[10px] font-bold rounded shadow-xs whitespace-nowrap">
            내 위치 ({currentLocation.name.split(' ').pop()})
          </span>
        </div>

        {/* 각 음식점 핀 마커들 (좌표 유효한 식당만 표출) */}
        {restaurants
          .filter(
            ({ restaurant }) =>
              restaurant.hasCoordinates &&
              restaurant.latitude !== null &&
              restaurant.longitude !== null
          )
          .map(({ restaurant, distance }) => {
            const { x, y } = getCoordinatesPercent(
              restaurant.latitude as number,
              restaurant.longitude as number
            );
            const isSelected = selectedPinId === restaurant.id;

          return (
            <div
              key={restaurant.id}
              onClick={() => setSelectedPinId(restaurant.id)}
              className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-150 ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`relative flex items-center justify-center p-1.5 rounded-full shadow-md transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-white ring-4 ring-amber-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div
                className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-xs pointer-events-none ${
                  isSelected
                    ? 'bg-amber-900 text-white'
                    : 'bg-white/95 text-gray-800 border border-gray-200'
                }`}
              >
                {restaurant.name.split(' ')[0]} ({formatDistance(distance)})
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 핀 프리뷰 카드 (핀을 선택했을 때 나타남) */}
      {activeRestaurantWithDist && (
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-white rounded-xl border border-gray-200 shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                  {activeRestaurantWithDist.restaurant.category}
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-semibold">
                  샘플
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  {formatDistance(activeRestaurantWithDist.distance)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {activeRestaurantWithDist.restaurant.name}
              </h4>
              <p className="text-xs text-gray-600 truncate mt-0.5">
                {activeRestaurantWithDist.restaurant.roadAddress}
              </p>
            </div>

            <button
              onClick={() =>
                onSelectRestaurant(activeRestaurantWithDist.restaurant)
              }
              className="shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <span>상세보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 하단 안내 문구 */}
      <div className="p-2 bg-white/90 border-t border-gray-200 text-[11px] text-gray-600 flex items-center justify-between px-3">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-gray-600" />
          핀을 클릭하면 음식점 정보가 표시됩니다
        </span>
        <span className="text-gray-600 hidden sm:inline">
          ※ 2단계에서 카카오 지도 SDK 정식 연동 예정
        </span>
      </div>
    </div>
  );
}
