'use client';

import React from 'react';
import { MapPin, Navigation, AlertCircle, Heart, LogIn, LogOut, Shield, User } from 'lucide-react';
import { UserLocation } from '@/types/restaurant';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  currentLocation: UserLocation;
  isLocating: boolean;
  isRealData: boolean;
  isFromDb?: boolean;
  totalApiCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  onOpenLocationModal: () => void;
  onRequestGeolocation: () => void;
  onOpenAdminModal: () => void;
}

export default function Header({
  currentLocation,
  isLocating,
  isRealData,
  isFromDb,
  totalApiCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  onOpenLocationModal,
  onRequestGeolocation,
  onOpenAdminModal,
}: HeaderProps) {
  const { user, profile, isAdmin, favoriteIds, openAuthModal, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-2.5">
        {/* 상단 1행: 로고 & 유저 인증/즐겨찾기/관리자 바 */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              동네식당
            </span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
              우리동네 음식점 탐색
            </span>
          </div>

          {/* 우측 인증/내메뉴 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 내 즐겨찾기 토글 버튼 */}
            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('login');
                } else {
                  onToggleFavoritesOnly();
                }
              }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                showFavoritesOnly
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
              title="내가 찜한 맛집 모아보기"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  showFavoritesOnly ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'
                }`}
              />
              <span>즐겨찾기</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  showFavoritesOnly ? 'bg-rose-600 text-white' : 'bg-rose-200 text-rose-800'
                }`}
              >
                {favoriteIds.size}
              </span>
            </button>

            {/* 관리자 버튼 (Admin이거나 테스트를 위해 상시 접근 가능) */}
            <button
              onClick={onOpenAdminModal}
              className={`p-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                isAdmin
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="신고 접수 및 리뷰 관리 센터"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] hidden sm:inline">관리센터</span>
            </button>

            {/* 로그인 / 프로필 바 */}
            {user ? (
              <div className="flex items-center gap-1 pl-1">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
                  <User className="w-3 h-3 text-emerald-600" />
                  <span className="max-w-[70px] truncate">{profile?.nickname || '회원'}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>

        {/* 상단 2행: 위치 선택 및 GPS */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-full transition-colors flex-1 min-w-0"
            title="동네 직접 선택하기"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              {currentLocation.name}
            </span>
            <span className="text-[10px] text-gray-500 shrink-0">▼</span>
          </button>

          <button
            onClick={onRequestGeolocation}
            disabled={isLocating}
            aria-label="현재 위치로 찾기"
            className={`p-2 rounded-full border transition-all shrink-0 ${
              isLocating
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600 animate-spin'
                : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-600 shadow-xs'
            }`}
            title="내 현재 GPS 위치로 찾기"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* 연동 안내 배너 */}
        {isRealData ? (
          <div className="mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs">
            <div className="flex items-center gap-1.5 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="font-bold text-[11px] truncate">
                {isFromDb ? 'Supabase PostGIS DB' : '공공데이터포털 상가정보'}
              </span>
              <span className="text-[10px] text-emerald-700 font-normal">
                ({currentLocation.name} 반경 {totalApiCount.toLocaleString()}곳)
              </span>
            </div>
            {showFavoritesOnly && (
              <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full font-bold shrink-0">
                즐겨찾기 필터 적용 중
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 text-xs text-amber-900 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-medium">샘플 데이터 모드</span>
          </div>
        )}
      </div>
    </header>
  );
}
