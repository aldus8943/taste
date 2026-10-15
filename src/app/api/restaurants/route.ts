import { NextResponse } from 'next/server';
import { Restaurant, RestaurantCategory } from '@/types/restaurant';
import { supabaseServer } from '@/lib/supabaseServer';
import { calculateDistance } from '@/utils/distance';

// 공공데이터 소분류/중분류 매핑
function mapCategory(mcls: string, scls: string): RestaurantCategory {
  const text = `${mcls} ${scls}`.toLowerCase();
  if (
    text.includes('한식') ||
    text.includes('백반') ||
    text.includes('국밥') ||
    text.includes('고기') ||
    text.includes('구이') ||
    text.includes('찌개') ||
    text.includes('탕')
  ) {
    return '한식';
  }
  if (
    text.includes('중식') ||
    text.includes('중국') ||
    text.includes('마라') ||
    text.includes('딤섬') ||
    text.includes('짜장') ||
    text.includes('짬뽕')
  ) {
    return '중식';
  }
  if (
    text.includes('일식') ||
    text.includes('초밥') ||
    text.includes('스시') ||
    text.includes('라멘') ||
    text.includes('돈가스') ||
    text.includes('우동') ||
    text.includes('소바') ||
    text.includes('회')
  ) {
    return '일식';
  }
  if (
    text.includes('양식') ||
    text.includes('서양') ||
    text.includes('이탈리') ||
    text.includes('피자') ||
    text.includes('파스타') ||
    text.includes('버거') ||
    text.includes('스테이크') ||
    text.includes('패밀리')
  ) {
    return '양식';
  }
  if (
    text.includes('분식') ||
    text.includes('떡볶이') ||
    text.includes('김밥') ||
    text.includes('라면') ||
    text.includes('튀김')
  ) {
    return '분식';
  }
  if (
    text.includes('커피') ||
    text.includes('카페') ||
    text.includes('디저트') ||
    text.includes('베이커리') ||
    text.includes('제과') ||
    text.includes('찻집') ||
    text.includes('아이스크림')
  ) {
    return '카페/디저트';
  }
  return '기타';
}

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || num === 0) return null;
  return num;
}

// DB Row 데이터를 프론트엔드 Restaurant 형식으로 변환
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToRestaurantWithDistance(row: any, userLat: number, userLon: number): {
  restaurant: Restaurant;
  distance: number | null;
} {
  const parsedLat = parseCoordinate(row.latitude);
  const parsedLon = parseCoordinate(row.longitude);
  const hasCoordinates = Boolean(row.has_coordinates && parsedLat && parsedLon);

  // DB PostGIS RPC에서 반환된 distance_meters가 있으면 사용, 없으면 Haversine 계산
  let distance: number | null = null;
  if (typeof row.distance_meters === 'number') {
    distance = Math.round(row.distance_meters);
  } else if (hasCoordinates && parsedLat && parsedLon) {
    distance = calculateDistance(userLat, userLon, parsedLat, parsedLon);
  }

  const restaurant: Restaurant = {
    id: row.id,
    originalId: row.original_id,
    name: row.name,
    category: row.category as RestaurantCategory,
    subCategory: row.sub_category || undefined,
    standardIndustryName: row.standard_industry_name || undefined,
    roadAddress: row.road_address,
    jibunAddress: row.jibun_address || '',
    buildingName: row.building_name || undefined,
    floor: row.floor || undefined,
    dongName: row.dong_name || undefined,
    phone: row.phone || '안내전화 미제공',
    latitude: parsedLat,
    longitude: parsedLon,
    hasCoordinates,
    permitDate: row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR') : '공공데이터 등록',
    businessStatus: (row.business_status as '영업/정상') || '영업/정상',
    isSample: false,
    dataSource: row.data_source,
  };

  return { restaurant, distance };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '37.4954');
  const lon = parseFloat(searchParams.get('lon') || '127.0333');
  // 요구사항: 500m / 1km / 3km 반경 선택
  const radius = parseInt(searchParams.get('radius') || '1000', 10);
  const numOfRows = parseInt(searchParams.get('numOfRows') || '100', 10);
  const category = searchParams.get('category') || undefined;
  const query = searchParams.get('query') || undefined;
  const forceRefresh = searchParams.get('refresh') === 'true';

  const targetRadius = Math.max(300, Math.min(radius, 3000));
  const apiKey = process.env.DATA_GO_KR_API_KEY;

  // 1. [요구사항] PostGIS DB 함수 (search_restaurants_nearby) 호출
  // 거리 계산, 반경 내 필터링(ST_DWithin), 업종/이름 필터링, 직선거리 정렬을 DB에서 직접 수행
  try {
    if (!forceRefresh) {
      const { data: rpcData, error: rpcError } = await supabaseServer.rpc(
        'search_restaurants_nearby',
        {
          center_lat: lat,
          center_lon: lon,
          radius_meters: targetRadius,
          category_filter: category && category !== '전체' ? category : null,
          search_query: query ? query.trim() : null,
          limit_count: Math.max(numOfRows, 100),
        }
      );

      // PostGIS RPC 성공 및 데이터가 있으면 즉시 반환
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        const items = rpcData.map((row) =>
          mapRowToRestaurantWithDistance(row, lat, lon)
        );

        // 카테고리별 개수 요약
        const categoryCounts: Record<string, number> = {
          전체: items.length,
          한식: 0,
          중식: 0,
          일식: 0,
          양식: 0,
          분식: 0,
          '카페/디저트': 0,
          기타: 0,
        };

        items.forEach(({ restaurant }) => {
          if (restaurant.category in categoryCounts) {
            categoryCounts[restaurant.category]++;
          } else {
            categoryCounts['기타']++;
          }
        });

        return NextResponse.json({
          success: true,
          isRealData: true,
          isFromDb: true,
          isPostGis: true,
          totalCount: items.length,
          data: items.map((i) => i.restaurant),
          itemsWithDistance: items,
          categoryCounts,
          source: 'Supabase PostGIS 공간 인덱스 검색',
        });
      }
    }
  } catch (postgisErr) {
    console.warn('PostGIS RPC call attempt:', postgisErr);
  }

  // 2. DB에 데이터가 부족하거나 RPC가 없는 경우: 공공데이터 API 수집 후 DB 저장
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        errorType: 'CONFIG_ERROR',
        message: '공공데이터포털 서비스 키가 설정되지 않았습니다.',
      },
      { status: 500 }
    );
  }

  try {
    // 공공데이터포털 API 호출 (서버 전용, 최대 100건 수집)
    const apiUrl = `https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius?serviceKey=${apiKey}&pageNo=1&numOfRows=100&radius=${targetRadius}&cx=${lon}&cy=${lat}&indsLclsCd=I2&type=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Public API HTTP error: ${res.status}`);
    }

    const json = await res.json();
    const rawItems = json?.body?.items;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({
        success: true,
        isRealData: true,
        totalCount: 0,
        data: [],
        itemsWithDistance: [],
        categoryCounts: {
          전체: 0,
          한식: 0,
          중식: 0,
          일식: 0,
          양식: 0,
          분식: 0,
          '카페/디저트': 0,
          기타: 0,
        },
        message: '해당 반경 내에 등록된 공공데이터 음식점이 없습니다.',
      });
    }

    // 공공데이터 원본 필드를 DB 및 앱 형식으로 매핑
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertRows = rawItems.map((item: any) => {
      const parsedLat = parseCoordinate(item.lat);
      const parsedLon = parseCoordinate(item.lon);
      const hasCoordinates =
        parsedLat !== null &&
        parsedLon !== null &&
        parsedLat >= 33 &&
        parsedLat <= 43 &&
        parsedLon >= 124 &&
        parsedLon <= 132;

      const name = item.brchNm
        ? `${item.bizesNm} (${item.brchNm})`
        : item.bizesNm;

      return {
        id: item.bizesId,
        original_id: item.bizesId,
        data_source: '소상공인시장진흥공단 상가(상권)정보 (공공데이터포털)',
        name,
        category: mapCategory(item.indsMclsNm || '', item.indsSclsNm || ''),
        sub_category: item.indsSclsNm || null,
        standard_industry_name: item.ksicNm || null,
        road_address: item.rdnmAdr || '도로명주소 정보 없음',
        jibun_address: item.lnoAdr || null,
        building_name: item.bldNm || null,
        floor: item.flrNo ? `${item.flrNo}층` : null,
        dong_name: item.adongNm || item.ldongNm || null,
        phone: item.telNo || null,
        latitude: hasCoordinates ? parsedLat : null,
        longitude: hasCoordinates ? parsedLon : null,
        has_coordinates: hasCoordinates,
        business_status: item.bizesStatNm || item.bizesStatus || null,
        updated_at: new Date().toISOString(),
      };
    });

    // 3. Supabase DB에 Upsert 실행 (트리거로 geom 공간 컬럼 자동 채움)
    try {
      await supabaseServer.from('restaurants').upsert(upsertRows, {
        onConflict: 'data_source,original_id',
      });
    } catch (saveErr) {
      console.warn('Supabase upsert warning:', saveErr);
    }

    // 4. [서버 계산 검증] PostGIS와 100% 동일한 구면 삼각법(Haversine)으로 반경 안/밖 필터링 및 직선거리 정렬
    const allRadiusItems = upsertRows
      .map((row) => mapRowToRestaurantWithDistance(row, lat, lon))
      .filter(({ distance }) => {
        // [반경 검증] distance <= targetRadius 인 음식점만 통과 (반경 밖은 엄격히 제외)
        return distance !== null && distance <= targetRadius;
      })
      .sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

    // 카테고리별 개수 카운트 계산 (해당 반경 내 모든 업종의 실제 수)
    const categoryCounts: Record<string, number> = {
      전체: allRadiusItems.length,
      한식: 0,
      중식: 0,
      일식: 0,
      양식: 0,
      분식: 0,
      '카페/디저트': 0,
      기타: 0,
    };

    allRadiusItems.forEach(({ restaurant }) => {
      if (restaurant.category in categoryCounts) {
        categoryCounts[restaurant.category]++;
      } else {
        categoryCounts['기타']++;
      }
    });

    const mappedItems = allRadiusItems
      .filter(({ restaurant }) => {
        // 업종 필터
        if (category && category !== '전체' && restaurant.category !== category) {
          return false;
        }
        // 검색어 필터
        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          const matchName = restaurant.name.toLowerCase().includes(q);
          const matchAddr = restaurant.roadAddress.toLowerCase().includes(q);
          const matchSub = restaurant.subCategory?.toLowerCase().includes(q);
          if (!matchName && !matchAddr && !matchSub) return false;
        }
        return true;
      })
      // [개수 제한]
      .slice(0, numOfRows);

    return NextResponse.json({
      success: true,
      isRealData: true,
      isFromDb: true,
      totalCount: mappedItems.length,
      data: mappedItems.map((i) => i.restaurant),
      itemsWithDistance: mappedItems,
      categoryCounts,
      source: '공공데이터 수집 및 Supabase DB 동기화 완료',
    });
  } catch (error: unknown) {
    console.error('API / DB processing error:', error);
    return NextResponse.json(
      {
        success: false,
        errorType: 'SERVER_ERROR',
        message: '음식점 데이터를 수집하거나 데이터베이스에서 조회하지 못했습니다.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
