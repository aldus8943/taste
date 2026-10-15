'use client';

import React from 'react';
import { X, MapPin, Navigation, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PRESET_LOCATIONS } from '@/data/sampleRestaurants';
import { UserLocation } from '@/types/restaurant';

interface LocationModalProps {
  isOpen: boolean;
  currentLocation: UserLocation;
  isLocating: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSelectLocation: (loc: {
    name: string;
    latitude: number;
    longitude: number;
  }) => void;
  onRequestGeolocation: () => void;
}

export default function LocationModal({
  isOpen,
  currentLocation,
  isLocating,
  errorMessage,
  onClose,
  onSelectLocation,
  onRequestGeolocation,
}: LocationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-base">기준 지역 선택</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* 위치 권한 거부/에러 발생 시 안내 박스 */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">위치 확인 안내</p>
                <p className="text-[11px] text-amber-800 mt-0.5 whitespace-pre-line">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* GPS 내 위치 사용 버튼 */}
          <button
            onClick={() => {
              onRequestGeolocation();
            }}
            disabled={isLocating}
            className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <Navigation
              className={`w-4 h-4 text-emerald-600 ${
                isLocating ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isLocating
                ? '현재 위치 확인 중...'
                : '내 브라우저 현재 위치로 설정 (GPS)'}
            </span>
          </button>

          {/* 지역 직접 선택 목록 */}
          <div>
            <div className="text-xs font-bold text-gray-600 mb-2 px-1 flex items-center justify-between">
              <span>동네 직접 선택 (위치 거부 시 권장)</span>
              <span className="text-[10px] text-gray-400 font-normal">기준 좌표 변경</span>
            </div>
            <div className="space-y-1.5">
              {PRESET_LOCATIONS.map((loc) => {
                const isCurrent =
                  Math.abs(loc.latitude - currentLocation.latitude) < 0.0001 &&
                  Math.abs(loc.longitude - currentLocation.longitude) < 0.0001;

                return (
                  <button
                    key={loc.name}
                    onClick={() => {
                      onSelectLocation({
                        name: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                      });
                      onClose();
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {loc.shortName}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {loc.name}
                      </div>
                    </div>
                    {isCurrent && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 개인정보 보호 안심 문구 (요구사항: 현재 위치는 DB에 저장하지 않음) */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              사용자의 GPS 위치 정보는 DB에 저장되지 않으며, 기기 내에서 거리 계산용으로만 안전하게 사용됩니다.
            </span>
          </div>
        </div>

        {/* 모달 닫기 */}
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
