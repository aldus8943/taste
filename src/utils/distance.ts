/**
 * Haversine 공식을 이용한 두 위경도 좌표 간 거리 계산 (단위: 미터)
 * 좌표가 없거나(null) 비정상적인 경우 null 반환
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null;
  }

  const R = 6371000; // 지구 반지름 (m)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * 거리를 사용자가 보기 편한 형식으로 변환 (예: 450m, 1.2km)
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '위치 미제공';
  }
  if (meters < 1000) {
    return `${meters}m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km}km`;
}
