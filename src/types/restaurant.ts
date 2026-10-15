export type RestaurantCategory =
  | '전체'
  | '한식'
  | '중식'
  | '일식'
  | '양식'
  | '분식'
  | '카페/디저트'
  | '기타';

export interface Restaurant {
  id: string;                      // 식별자 (실제 데이터: bizesId)
  originalId: string;              // 원본 공공데이터 ID 보존
  name: string;                    // 상호명 (bizesNm + brchNm)
  category: RestaurantCategory;    // 정규화된 업종 대분류
  subCategory?: string;            // 공공데이터 소분류명 (indsSclsNm)
  standardIndustryName?: string;   // 표준산업분류명 (ksicNm)
  roadAddress: string;             // 도로명 주소 (rdnmAdr)
  jibunAddress: string;            // 지번 주소 (lnoAdr)
  buildingName?: string;           // 건물명 (bldNm)
  floor?: string;                  // 층정보 (flrNo)
  dongName?: string;               // 행정동명 (adongNm)
  phone?: string;                  // 전화번호
  latitude: number | null;         // 위도 (좌표 없는 데이터는 null)
  longitude: number | null;        // 경도 (좌표 없는 데이터는 null)
  hasCoordinates: boolean;         // 유효한 위경도 좌표 여부
  permitDate?: string;             // 등록/인허가 정보
  businessStatus: '영업/정상' | '휴업' | '폐업' | '정보확인중';
  isSample: boolean;               // 실제 데이터(false) vs 샘플 데이터(true)
  dataSource: string;              // 데이터 출처 보존
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  name: string;
  isCustom?: boolean;              // 수동 선택 여부
}

export type DistanceRadius = 500 | 1000 | 3000; // 500m / 1km / 3km
