import { Capacitor } from '@capacitor/core';

/**
 * 기본 프로덕션 백엔드 API 호스트
 */
const DEFAULT_REMOTE_API_BASE = 'https://taste-dr8l.vercel.app';

/**
 * 현재 실행 환경(Web 브라우저 vs Capacitor 네이티브 앱)에 맞는 API Base URL 반환
 */
export function getApiBaseUrl(): string {
  // 1. 환경변수로 지정된 API 주소가 있는 경우 최우선 적용
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Capacitor 네이티브 모바일 앱(iOS / Android) 환경에서 실행 중인 경우
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return DEFAULT_REMOTE_API_BASE;
  }

  // 3. 브라우저에서 실행 중이더라도 커스텀 로컬호스트나 파일 스킴인 경우
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('file://')
    ) {
      return DEFAULT_REMOTE_API_BASE;
    }
  }

  // 4. 일반 웹 브라우저에서는 상대 경로('') 사용 (동일 도메인 쿠키/프록시 최적화)
  return '';
}

/**
 * 상대 API 경로(예: '/api/restaurants')를 환경에 맞는 풀 URL로 변환
 */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
