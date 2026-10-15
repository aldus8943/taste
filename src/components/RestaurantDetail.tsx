'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  Copy,
  Check,
  Navigation,
  AlertCircle,
  ExternalLink,
  Database,
  Tag,
  Ban,
} from 'lucide-react';
import { Restaurant } from '@/types/restaurant';
import { formatDistance } from '@/utils/distance';

interface RestaurantDetailProps {
  restaurant: Restaurant | null;
  distanceInMeters: number | null;
  onClose: () => void;
}

export default function RestaurantDetail({
  restaurant,
  distanceInMeters,
  onClose,
}: RestaurantDetailProps) {
  const [copied, setCopied] = useState(false);

  if (!restaurant) return null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.roadAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // 좌표가 있는 경우와 없는 경우의 카카오맵 링크 처리
  const kakaoMapUrl = restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
    ? `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;

  const kakaoRouteUrl = restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
    ? `https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* 상단 드래그 핸들 (모바일 전용) */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.2 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                {restaurant.category}
              </span>
              {restaurant.subCategory && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                  {restaurant.subCategory}
                </span>
              )}
              {restaurant.isSample ? (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded">
                  샘플 데이터
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-xs font-bold rounded">
                  공공데이터 실시간 연동
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 break-words">{restaurant.name}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 내용 */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* 요구사항 준수: 제공되지 않는 평점, 리뷰, 사진, 영업시간 안내 */}
          <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>미제공 항목 안내 (정직한 데이터 표기 원칙)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed pl-5">
              공공데이터(소상공인시장진흥공단) 규격상 <strong>평점, 사용자 리뷰, 매장 사진, 상세 영업시간</strong>은 제공되지 않으므로 임의로 생성하지 않습니다.
            </p>
          </div>

          {/* 직선거리 정보 카드 */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <Navigation className="w-4 h-4 text-emerald-600" />
              <span>내 위치 기준 직선거리</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">
              {formatDistance(distanceInMeters)}
            </span>
          </div>

          {/* 원본 정보 보존 영역 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-slate-200 pb-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span>공공데이터 원본 명세 보존 정보</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block">원본 상가업소번호 (ID)</span>
                <span className="font-mono font-medium text-slate-800 break-all">
                  {restaurant.originalId || restaurant.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">데이터 출처</span>
                <span className="font-medium text-slate-800 truncate block">
                  {restaurant.dataSource}
                </span>
              </div>
              {restaurant.standardIndustryName && (
                <div className="col-span-2">
                  <span className="text-slate-400 block">표준산업분류</span>
                  <span className="font-medium text-slate-800">
                    {restaurant.standardIndustryName}
                  </span>
                </div>
              )}
              {restaurant.hasCoordinates ? (
                <div className="col-span-2 flex items-center gap-3 font-mono text-[11px] text-slate-500">
                  <span>위도: {restaurant.latitude?.toFixed(6)}</span>
                  <span>경도: {restaurant.longitude?.toFixed(6)}</span>
                </div>
              ) : (
                <div className="col-span-2 flex items-center gap-1.5 text-amber-700 font-medium">
                  <Ban className="w-3.5 h-3.5" />
                  <span>공공데이터 원본에 위경도 좌표가 미포함된 업소입니다.</span>
                </div>
              )}
            </div>
          </div>

          {/* 상세 주소 및 전화번호 목록 */}
          <div className="space-y-3 text-sm">
            {/* 도로명 주소 */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">소재지 도로명주소</div>
                <div className="text-gray-700 text-xs mt-0.5 break-all">
                  {restaurant.roadAddress}
                </div>
                {restaurant.jibunAddress && (
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    (지번) {restaurant.jibunAddress}
                  </div>
                )}
                {restaurant.floor && (
                  <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    <span>{restaurant.floor}</span>
                    {restaurant.buildingName && <span>({restaurant.buildingName})</span>}
                  </div>
                )}
              </div>
              <button
                onClick={handleCopyAddress}
                className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 font-medium transition-colors"
                title="주소 복사"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>

            {/* 전화번호 */}
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">전화번호</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {restaurant.phone || '공공데이터에 등록된 전화번호가 없습니다.'}
                </div>
              </div>
              {restaurant.phone && restaurant.phone.startsWith('0') && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>전화걸기</span>
                </a>
              )}
            </div>

            {/* 영업상태 */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>영업 상태 (공공데이터 기준)</span>
              </div>
              <span className="font-semibold text-emerald-700">{restaurant.businessStatus}</span>
            </div>
          </div>

          {/* 카카오 지도 길찾기 / 지도 바로가기 버튼 */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
            <a
              href={kakaoRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>카카오맵 길찾기</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <a
              href={kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span>카카오 지도에서 보기</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-sm rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
