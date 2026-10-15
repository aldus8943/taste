'use client';

import React from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { UserLocation } from '@/types/restaurant';

interface HeaderProps {
  currentLocation: UserLocation;
  isLocating: boolean;
  isRealData: boolean;
  isFromDb?: boolean;
  totalApiCount: number;
  onOpenLocationModal: () => void;
  onRequestGeolocation: () => void;
}

export default function Header({
  currentLocation,
  isLocating,
  isRealData,
  isFromDb,
  totalApiCount,
  onOpenLocationModal,
  onRequestGeolocation,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3">
        {/* 상단 타이틀 및 위치 선택 바 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              동네식당
            </span>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              우리동네 음식점 탐색
            </span>
          </div>

          {/* 현재 위치 선택 버튼 & GPS 버튼 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-full transition-colors"
              title="동네 직접 선택하기"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {currentLocation.name}
              </span>
              <span className="text-[10px] text-gray-500">▼</span>
            </button>

            <button
              onClick={onRequestGeolocation}
              disabled={isLocating}
              aria-label="현재 위치로 찾기"
              className={`p-2 rounded-full border transition-all ${
                isLocating
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600 animate-spin'
                  : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-600 shadow-xs'
              }`}
              title="내 현재 GPS 위치로 찾기"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 연동 안내 배너: Supabase DB vs 실시간 공공데이터 vs 샘플 데이터 */}
        {isRealData ? (
          <div className="mt-2.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-900 leading-relaxed shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse" />
            <div>
              <div className="font-bold flex items-center gap-1.5 flex-wrap">
                <span>{isFromDb ? 'Supabase DB 데이터 조회 중' : '공공데이터포털 실시간 데이터 연동 중'}</span>
                {isFromDb ? (
                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] rounded font-bold">
                    SUPABASE DB
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded font-bold">
                    LIVE API
                  </span>
                )}
                <span className="text-[11px] text-emerald-700 font-normal">
                  (소상공인시장진흥공단)
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {currentLocation.name} 기준 반경 내 실제 음식점 정보를 데이터베이스에서 불러오고 있습니다. (인근 총 {totalApiCount.toLocaleString()}곳 등록)
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 px-3 py-2 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900 leading-relaxed shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>화면 프로토타입 단계 (샘플 음식점 표시 중)</span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[10px] rounded font-bold">
                  MOCK
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                공공데이터 API 연결 대기 중입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
