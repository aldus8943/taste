'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Layers, ChevronRight, AlertTriangle, ExternalLink, Navigation } from 'lucide-react';
import { Restaurant, UserLocation, DistanceRadius } from '@/types/restaurant';
import { formatDistance } from '@/utils/distance';
import MapView from './MapView';

interface RestaurantWithDistance {
  restaurant: Restaurant;
  distance: number | null;
}

interface KakaoMapViewProps {
  currentLocation: UserLocation;
  restaurants: RestaurantWithDistance[];
  selectedRadius: DistanceRadius;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

export default function KakaoMapView({
  currentLocation,
  restaurants,
  selectedRadius,
  onSelectRestaurant,
}: KakaoMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const [activeRestaurant, setActiveRestaurant] =
    useState<RestaurantWithDistance | null>(null);
  const [sdkStatus, setSdkStatus] = useState<
    'loading' | 'ready' | 'fallback'
  >('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  // 카카오 지도 SDK 로드
  useEffect(() => {
    if (!kakaoAppKey) {
      setSdkStatus('fallback');
      setErrorMessage('카카오 지도 API 키가 설정되지 않아 프로토타입 지도로 표시합니다.');
      return;
    }

    // 이미 window.kakao가 로드되어 있는 경우
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setSdkStatus('ready');
      });
      return;
    }

    const scriptId = 'kakao-maps-sdk';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao);
          window.kakao.maps.load(() => {
            setSdkStatus('ready');
          });
        }
      }, 100);
      return () => clearInterval(checkKakao);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          setSdkStatus('ready');
        });
      } else {
        setSdkStatus('fallback');
        setErrorMessage('카카오 지도 객체 로드에 실패하여 프로토타입 지도로 전환합니다.');
      }
    };

    script.onerror = () => {
      setSdkStatus('fallback');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://taste-dr8l.vercel.app';
      setErrorMessage(
        `카카오 지도 SDK를 불러오지 못했습니다. 카카오 개발자 콘솔의 [Web 플랫폼 사이트 도메인]에 현재 주소(${origin})를 등록해 주세요.`
      );
    };

    document.head.appendChild(script);
  }, [kakaoAppKey]);

  // 지도 인스턴스 초기화
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

    const centerCoords = new window.kakao.maps.LatLng(
      currentLocation.latitude,
      currentLocation.longitude
    );

    // 줌 레벨 결정
    let level = 5;
    if (selectedRadius === 500) level = 4;
    else if (selectedRadius === 1000) level = 5;
    else if (selectedRadius === 3000) level = 6;

    const mapOptions = {
      center: centerCoords,
      level,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOptions);
    mapInstanceRef.current = map;

    // 지도 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
  }, [currentLocation.latitude, currentLocation.longitude, selectedRadius]);

  // 지도 생성 후 중심 좌표 및 마커 렌더링
  useEffect(() => {
    if (sdkStatus !== 'ready') return;

    if (!mapInstanceRef.current) {
      initMap();
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const centerCoords = new window.kakao.maps.LatLng(
      currentLocation.latitude,
      currentLocation.longitude
    );
    map.setCenter(centerCoords);

    // 줌 레벨 업데이트
    let targetLevel = 5;
    if (selectedRadius === 500) targetLevel = 4;
    else if (selectedRadius === 1000) targetLevel = 5;
    else if (selectedRadius === 3000) targetLevel = 6;
    map.setLevel(targetLevel);

    // 이전 원 삭제
    if (circleInstanceRef.current) {
      circleInstanceRef.current.setMap(null);
      circleInstanceRef.current = null;
    }

    // 반경 원 그리기
    if (selectedRadius > 0) {
      const circle = new window.kakao.maps.Circle({
        center: centerCoords,
        radius: selectedRadius,
        strokeWeight: 2,
        strokeColor: '#059669',
        strokeOpacity: 0.8,
        strokeStyle: 'dashed',
        fillColor: '#10b981',
        fillOpacity: 0.12,
      });
      circle.setMap(map);
      circleInstanceRef.current = circle;
    }

    // 이전 마커들 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 현재 위치 마커 (중심)
    const currentLocMarker = new window.kakao.maps.CustomOverlay({
      position: centerCoords,
      content: `
        <div style="position:relative; transform:translate(-50%, -50%); display:flex; flex-direction:column; align-items:center; z-index:25;">
          <div style="position:absolute; width:36px; height:36px; background-color:rgba(37,99,235,0.25); border-radius:50%; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:20px; height:20px; background-color:#2563eb; border:3px solid white; border-radius:50%; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3); z-index:2;"></div>
          <div style="background:#1e3a8a; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.25); z-index:2;">내 위치</div>
        </div>
      `,
    });
    currentLocMarker.setMap(map);
    markersRef.current.push(currentLocMarker);

    // 음식점 마커들 렌더링 (좌표가 유효한 식당만 렌더링)
    restaurants.forEach((item) => {
      const { restaurant, distance } = item;
      if (!restaurant.hasCoordinates || !restaurant.latitude || !restaurant.longitude) {
        return;
      }
      const pos = new window.kakao.maps.LatLng(
        restaurant.latitude,
        restaurant.longitude
      );

      const markerOverlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: `
          <div id="marker-${restaurant.id}" style="cursor:pointer; transform:translate(-50%, -100%); margin-top:-5px; text-align:center;">
            <div style="background-color:#059669; color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.2); display:inline-flex; align-items:center; gap:4px; border:2px solid white;">
              <span>${restaurant.name.split(' ')[0]}</span>
              <span style="opacity:0.85; font-size:10px;">${formatDistance(distance)}</span>
            </div>
            <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #059669; margin:0 auto;"></div>
          </div>
        `,
      });

      markerOverlay.setMap(map);
      markersRef.current.push(markerOverlay);

      // DOM 요소 클릭 이벤트 연결
      setTimeout(() => {
        const el = document.getElementById(`marker-${restaurant.id}`);
        if (el) {
          el.onclick = () => {
            setActiveRestaurant(item);
            map.panTo(pos);
          };
        }
      }, 50);
    });
  }, [sdkStatus, currentLocation, restaurants, selectedRadius, initMap]);

  // 카카오 SDK 로드 실패 시 앞서 제작한 1단계 인터랙티브 맵으로 자연스럽게 fallback
  if (sdkStatus === 'fallback') {
    return (
      <div className="space-y-2">
        {errorMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">카카오 지도 안내</p>
              <p className="text-[11px] text-amber-800 mt-0.5">{errorMessage}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(window.location.origin);
                      alert(`현재 도메인(${window.location.origin})이 클립보드에 복사되었습니다!\n카카오 개발자 콘솔 [플랫폼] > [Web] 사이트 도메인에 붙여넣어 등록해 주세요.`);
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                >
                  현재 도메인 복사
                </button>
                <a
                  href="https://developers.kakao.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold underline"
                >
                  카카오 개발자 콘솔 바로가기 (Web 플랫폼 사이트 도메인 등록)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
        <MapView
          currentLocation={currentLocation}
          restaurants={restaurants}
          selectedRadius={selectedRadius}
          onSelectRestaurant={onSelectRestaurant}
        />
      </div>
    );
  }

  // 카카오맵 웹/앱으로 연결
  const handleOpenKakaoMap = () => {
    // 1. 선택된 음식점이 있는 경우 해당 음식점 카카오맵 페이지로 이동
    if (activeRestaurant) {
      const { restaurant } = activeRestaurant;
      const url =
        restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
          ? `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
          : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. 현재 지도 중심 좌표 기준으로 카카오맵 이동
    let lat = currentLocation.latitude;
    let lng = currentLocation.longitude;
    if (mapInstanceRef.current && window.kakao?.maps) {
      try {
        const center = mapInstanceRef.current.getCenter();
        if (center) {
          lat = center.getLat();
          lng = center.getLng();
        }
      } catch (err) {
        console.error('Failed to get map center:', err);
      }
    }

    const title = currentLocation.name ? `${currentLocation.name} 맛집` : '내 주변 맛집';
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(title)},${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] bg-slate-100 rounded-2xl overflow-hidden border border-gray-300 shadow-inner flex flex-col">
      {/* 상단 오버레이 헤더 */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs pointer-events-auto flex items-center gap-2 text-xs">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800">
            {selectedRadius > 0
              ? `${formatDistance(selectedRadius)} 반경 (${restaurants.length}개소)`
              : `전체 반경 (${restaurants.length}개소)`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenKakaoMap}
          className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-yellow-950 font-bold px-2.5 py-1.5 rounded-lg text-[11px] shadow-xs hover:shadow-md pointer-events-auto flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
          title={
            activeRestaurant
              ? `카카오맵에서 '${activeRestaurant.restaurant.name}' 보기 (새 창)`
              : '카카오맵에서 현재 위치 지도 보기 (새 창)'
          }
        >
          <span>카카오 지도 정식 연동</span>
          <ExternalLink className="w-3.5 h-3.5 text-yellow-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* 카카오 지도 렌더링 컨테이너 */}
      <div ref={mapContainerRef} className="w-full flex-1" />

      {/* 내 위치로 지도 맞추기 플로팅 버튼 */}
      <button
        onClick={() => {
          if (mapInstanceRef.current && window.kakao?.maps) {
            const center = new window.kakao.maps.LatLng(
              currentLocation.latitude,
              currentLocation.longitude
            );
            mapInstanceRef.current.panTo(center);
          }
        }}
        className="absolute top-14 right-3 z-20 bg-white hover:bg-gray-50 text-gray-800 p-2.5 rounded-xl border border-gray-300 shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
        title="내 현재 위치로 지도 맞추기"
      >
        <Navigation className="w-4 h-4 text-blue-600" />
        <span className="hidden sm:inline">내 위치</span>
      </button>

      {/* 하단 선택된 음식점 카드 프리뷰 */}
      {activeRestaurant && (
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-white rounded-xl border border-gray-200 shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                  {activeRestaurant.restaurant.category}
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-semibold">
                  샘플
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  {formatDistance(activeRestaurant.distance)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {activeRestaurant.restaurant.name}
              </h4>
              <p className="text-xs text-gray-600 truncate mt-0.5">
                {activeRestaurant.restaurant.roadAddress}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const { restaurant } = activeRestaurant;
                  const url =
                    restaurant.hasCoordinates && restaurant.latitude && restaurant.longitude
                      ? `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.latitude},${restaurant.longitude}`
                      : `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.roadAddress || restaurant.name)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="px-2.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title="카카오맵에서 보기 (새 창)"
              >
                <span>카카오맵</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectRestaurant(activeRestaurant.restaurant)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>상세보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
