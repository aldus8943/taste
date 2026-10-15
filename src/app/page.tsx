'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import DistanceFilter from '@/components/DistanceFilter';
import RestaurantList from '@/components/RestaurantList';
import KakaoMapView from '@/components/KakaoMapView';
import RestaurantDetail from '@/components/RestaurantDetail';
import LocationModal from '@/components/LocationModal';
import ViewToggle from '@/components/ViewToggle';
import {
  Loader2,
  Navigation,
  Compass,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';

import {
  Restaurant,
  RestaurantCategory,
  UserLocation,
  DistanceRadius,
} from '@/types/restaurant';
import {
  SAMPLE_RESTAURANTS,
  DEFAULT_LOCATION,
} from '@/data/sampleRestaurants';
import { calculateDistance } from '@/utils/distance';

interface RestaurantWithDistance {
  restaurant: Restaurant;
  distance: number | null;
}

const CATEGORIES: RestaurantCategory[] = [
  '전체',
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '카페/디저트',
  '기타',
];

export default function Home() {
  // 1. 현재 사용자 기준 위치 (⚠️ DB 저장 없음, React State 메모리로만 관리)
  const [currentLocation, setCurrentLocation] =
    useState<UserLocation>(DEFAULT_LOCATION);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationToast, setLocationToast] = useState<string | null>(null);
  const [locationErrorDetail, setLocationErrorDetail] = useState<string | null>(null);

  // 2. 검색 및 필터 상태 (기본 반경: 1km)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] =
    useState<RestaurantCategory>('전체');
  const [selectedRadius, setSelectedRadius] = useState<DistanceRadius>(1000);

  // 3. 뷰 모드 ('list' | 'map')
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list');

  // 4. 데이터 상태 (PostGIS & Supabase DB 기반)
  const [displayLimit, setDisplayLimit] = useState<number>(20);
  const [allRestaurantsWithDistance, setAllRestaurantsWithDistance] = useState<
    RestaurantWithDistance[]
  >([]);
  const [isRealData, setIsRealData] = useState<boolean>(true);
  const [isFromDb, setIsFromDb] = useState<boolean>(false);
  const [totalApiCount, setTotalApiCount] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 5. 모달 상태
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] =
    useState<boolean>(false);

  // [핵심] PostGIS 공간 검색 및 거리 계산 API 호출 함수
  // 카테고리 필터와 무관하게 해당 반경 및 검색어 조건의 모든 음식점을 수집하여
  // '전체', '한식', '중식' 등 모든 카테고리 뱃지 숫자가 0으로 증발하지 않고 처음부터 정확히 표시되도록 합니다.
  const fetchRestaurantsData = useCallback(
    async (
      lat: number,
      lon: number,
      radius: DistanceRadius,
      query: string,
      refresh: boolean = false
    ) => {
      setIsLoadingData(true);
      setApiError(null);
      try {
        const queryRadius = radius > 0 ? radius : 1000;
        const refreshParam = refresh ? '&refresh=true' : '';
        const queryParam = query.trim() ? `&query=${encodeURIComponent(query.trim())}` : '';

        const url = `/api/restaurants?lat=${lat}&lon=${lon}&radius=${queryRadius}&numOfRows=100${queryParam}${refreshParam}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.success === false) {
          throw new Error(json.message || `API 오류 (HTTP ${res.status})`);
        }

        if (json.itemsWithDistance && Array.isArray(json.itemsWithDistance)) {
          setAllRestaurantsWithDistance(json.itemsWithDistance);
          setIsRealData(Boolean(json.isRealData));
          setIsFromDb(Boolean(json.isFromDb));
          setTotalApiCount(json.totalCount || json.itemsWithDistance.length);
        } else if (json.data && Array.isArray(json.data)) {
          // fallback 매핑
          const fallbackItems = json.data.map((r: Restaurant) => ({
            restaurant: r,
            distance: calculateDistance(lat, lon, r.latitude, r.longitude),
          }));
          setAllRestaurantsWithDistance(fallbackItems);
          setIsRealData(Boolean(json.isRealData));
          setIsFromDb(Boolean(json.isFromDb));
          setTotalApiCount(json.totalCount || json.data.length);
        } else {
          setAllRestaurantsWithDistance([]);
          setTotalApiCount(0);
        }
      } catch (err: unknown) {
        console.error('Failed to load restaurants from PostGIS/API:', err);
        const errMsg =
          err instanceof Error
            ? err.message
            : '데이터베이스 및 공공데이터 서버와 통신하는 중 문제가 발생했습니다.';
        setApiError(errMsg);
      } finally {
        setIsLoadingData(false);
      }
    },
    []
  );

  // 기준 위치, 반경, 검색어 변경 시 실시간 PostGIS 공간 검색
  // (카테고리 선택 시에는 네트워크 재호출 없이 클라이언트에서 즉시 0ms 전환)
  useEffect(() => {
    fetchRestaurantsData(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedRadius,
      searchQuery
    );
  }, [
    currentLocation,
    selectedRadius,
    searchQuery,
    fetchRestaurantsData,
  ]);

  // 카테고리나 반경, 위치, 검색어 변경 시 페이징 개수 리셋
  useEffect(() => {
    setDisplayLimit(20);
  }, [selectedCategory, selectedRadius, currentLocation, searchQuery]);

  // 위치나 반경이 바뀌면 조회 건수를 기본 20건으로 초기화
  const handleLocationChange = (loc: {
    name: string;
    latitude: number;
    longitude: number;
  }) => {
    setDisplayLimit(20);
    setSelectedCategory('전체');
    setCurrentLocation({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      isCustom: true,
    });
    setLocationErrorDetail(null);
    setLocationToast(`기준 위치가 '${loc.name}'(으)로 변경되었습니다.`);
    setTimeout(() => setLocationToast(null), 3000);
  };

  /**
   * [내 주변 찾기] - 버튼을 누를 때 브라우저 위치 권한 요청
   * - 사용자 현재 위치는 DB에 저장하지 않음 (메모리 상태로만 유지)
   * - 권한 거부, 시간 초과, 미지원 시 정밀 에러 처리 및 지역 직접 선택 모달 오픈
   */
  const handleRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg =
        '현재 사용 중인 브라우저가 위치 정보 서비스를 지원하지 않습니다.\n아래에서 기준 동네를 직접 선택해 주세요.';
      setLocationErrorDetail(msg);
      setLocationToast('위치 서비스를 지원하지 않는 브라우저입니다.');
      setIsLocationModalOpen(true);
      return;
    }

    setIsLocating(true);
    setLocationToast('현재 내 위치(GPS)를 확인하고 있습니다...');
    setLocationErrorDetail(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDisplayLimit(20);
        setSelectedCategory('전체');
        setCurrentLocation({
          name: '내 현재 위치 (GPS)',
          latitude,
          longitude,
          isCustom: false,
        });
        setIsLocating(false);
        setLocationErrorDetail(null);
        setLocationToast('내 GPS 위치로 기준 좌표가 설정되었습니다.');
        setTimeout(() => setLocationToast(null), 3000);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = '';
        let toastMsg = '';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              '브라우저 위치 권한이 차단(거부)되었습니다.\n브라우저 주소창 설정에서 권한을 허용하시거나, 아래에서 원하시는 지역을 직접 선택해 주세요.';
            toastMsg = '위치 권한이 거부되었습니다. 지역을 직접 선택해 주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg =
              'GPS 신호를 수신할 수 없거나 현재 위치 정보를 확인할 수 없습니다.\n아래에서 기준 지역을 직접 선택해 주세요.';
            toastMsg = '현재 위치를 확인할 수 없습니다. 지역을 직접 선택해 주세요.';
            break;
          case error.TIMEOUT:
            errorMsg =
              '위치 확인 응답 시간이 초과되었습니다.\n다시 시도하거나 아래에서 지역을 직접 선택해 주세요.';
            toastMsg = '위치 확인 시간이 초과되었습니다. 지역을 직접 선택해 주세요.';
            break;
          default:
            errorMsg =
              '알 수 없는 오류로 위치 정보를 가져오지 못했습니다.\n지역을 직접 선택해 주세요.';
            toastMsg = '위치 정보를 가져올 수 없습니다.';
            break;
        }

        setLocationErrorDetail(errorMsg);
        setLocationToast(toastMsg);
        setIsLocationModalOpen(true);
        setTimeout(() => setLocationToast(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  }, []);

  // [핵심 해결] 카테고리별 개수 카운트:
  // 현재 반경 및 검색어 조건에 속한 전체 음식점을 기준으로 모든 카테고리 숫자를 계산합니다.
  // 따라서 다른 카테고리를 눌러도 다른 카테고리 숫자가 0으로 변하지 않고 본래 개수가 그대로 유지됩니다.
  const categoryCounts = useMemo(() => {
    const counts: Record<RestaurantCategory, number> = {
      전체: allRestaurantsWithDistance.length,
      한식: 0,
      중식: 0,
      일식: 0,
      양식: 0,
      분식: 0,
      '카페/디저트': 0,
      기타: 0,
    };

    allRestaurantsWithDistance.forEach(({ restaurant }) => {
      if (restaurant.category in counts) {
        counts[restaurant.category] += 1;
      } else {
        counts['기타'] += 1;
      }
    });

    return counts;
  }, [allRestaurantsWithDistance]);

  // [요구사항] 지도와 목록에 동일한 검색 결과를 표시하기 위한 통합 배열
  // 선택된 카테고리에 맞춰 필터링을 수행합니다. (전체일 경우 모두 표시)
  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === '전체') {
      return allRestaurantsWithDistance;
    }
    return allRestaurantsWithDistance.filter(
      ({ restaurant }) => restaurant.category === selectedCategory
    );
  }, [allRestaurantsWithDistance, selectedCategory]);

  // 목록 뷰에서 20개씩 끊어서 보여줄 페이징 배열
  const displayedRestaurants = useMemo(() => {
    return filteredRestaurants.slice(0, displayLimit);
  }, [filteredRestaurants, displayLimit]);

  // 선택된 상세 식당의 거리
  const selectedRestaurantDistance = useMemo(() => {
    if (!selectedRestaurant) return null;
    const found = allRestaurantsWithDistance.find(
      (item) => item.restaurant.id === selectedRestaurant.id
    );
    return found ? found.distance : null;
  }, [selectedRestaurant, allRestaurantsWithDistance]);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('전체');
    setSelectedRadius(1000);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== '전체' ||
    selectedRadius !== 1000;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 pb-24">
      {/* 1. 상단 헤더 */}
      <Header
        currentLocation={currentLocation}
        isLocating={isLocating}
        isRealData={isRealData}
        isFromDb={isFromDb}
        totalApiCount={totalApiCount}
        onOpenLocationModal={() => {
          setLocationErrorDetail(null);
          setIsLocationModalOpen(true);
        }}
        onRequestGeolocation={handleRequestGeolocation}
      />

      {/* 안내 토스트 (위치 변경 또는 권한 거부 시) */}
      {locationToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/95 text-white text-xs px-4 py-2.5 rounded-full shadow-xl backdrop-blur-xs animate-in fade-in duration-200 text-center max-w-[90vw] flex items-center gap-2">
          {isLocating && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />}
          <span>{locationToast}</span>
        </div>
      )}

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full px-4 pt-3 space-y-3.5 flex-1">
        {/* 상단 퀵 액션 바: 내 주변 찾기 메인 버튼 & 현재 기준 동네 안내 & DB 갱신 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-3.5 text-white shadow-md flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-emerald-100 flex items-center gap-1 font-medium">
              <Compass className="w-3.5 h-3.5" />
              <span>현재 기준 탐색 위치</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold truncate mt-0.5">
              {currentLocation.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() =>
                fetchRestaurantsData(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  selectedRadius,
                  searchQuery,
                  true // 강제 최신 공공데이터 동기화 갱신
                )
              }
              disabled={isLoadingData}
              className="p-2 bg-emerald-800/60 hover:bg-emerald-800 text-emerald-100 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1 active:scale-95"
              title="공공데이터 다시 수집하여 DB 최신화"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">DB 갱신</span>
            </button>

            <button
              onClick={handleRequestGeolocation}
              disabled={isLocating}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Navigation
                className={`w-3.5 h-3.5 text-emerald-600 ${
                  isLocating ? 'animate-spin' : ''
                }`}
              />
              <span>{isLocating ? 'GPS 찾는 중...' : '내 주변 찾기'}</span>
            </button>
          </div>
        </div>

        {/* API 통신 오류 발생 시 안내 배너 및 재시도 */}
        {apiError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">데이터 통신 오류</p>
                <p className="text-[11px] text-red-700 mt-0.5">{apiError}</p>
              </div>
            </div>
            <button
              onClick={() =>
                fetchRestaurantsData(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  selectedRadius,
                  searchQuery
                )
              }
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>재시도</span>
            </button>
          </div>
        )}

        {/* 검색바 */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* 반경 선택 (500m / 1km / 3km) */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 mb-1 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>내 주변 반경 범위 (PostGIS 공간 검색)</span>
              {isLoadingData && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-normal">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>거리순 정렬 조회 중...</span>
                </span>
              )}
            </span>
            <span className="text-[10px] text-gray-400 font-normal">
              선택한 범위 안의 음식점만 표시
            </span>
          </div>
          <DistanceFilter
            selectedRadius={selectedRadius}
            onSelectRadius={setSelectedRadius}
          />
        </div>

        {/* 업종 카테고리 필터 */}
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={categoryCounts}
        />

        {/* 3. 뷰 전환 본문 (목록 뷰 or 지도 뷰 - [요구사항] 목록과 지도에 동일한 결과 표시) */}
        <div className="pt-1">
          {currentView === 'list' ? (
            <div className="space-y-4">
              <RestaurantList
                items={displayedRestaurants}
                totalCount={filteredRestaurants.length}
                onSelectRestaurant={(rest) => setSelectedRestaurant(rest)}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* 더보기 버튼 */}
              {filteredRestaurants.length > displayLimit && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 20)}
                    disabled={isLoadingData}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span>
                      음식점 더 보기 ({displayedRestaurants.length}/{filteredRestaurants.length})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <KakaoMapView
              currentLocation={currentLocation}
              restaurants={filteredRestaurants}
              selectedRadius={selectedRadius}
              onSelectRestaurant={(rest) => setSelectedRestaurant(rest)}
            />
          )}
        </div>
      </main>

      {/* 4. 화면 하단 중앙 플로팅 뷰 토글러 */}
      <ViewToggle
        currentView={currentView}
        onToggle={(view) => setCurrentView(view)}
      />

      {/* 5. 상세 화면 모달/바텀시트 */}
      {selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          distanceInMeters={selectedRestaurantDistance}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}

      {/* 6. 지역 직접 선택 모달 (위치 권한 거부 시 또는 수동 선택) */}
      <LocationModal
        isOpen={isLocationModalOpen}
        currentLocation={currentLocation}
        isLocating={isLocating}
        errorMessage={locationErrorDetail}
        onClose={() => {
          setIsLocationModalOpen(false);
          setLocationErrorDetail(null);
        }}
        onSelectLocation={handleLocationChange}
        onRequestGeolocation={handleRequestGeolocation}
      />
    </div>
  );
}
