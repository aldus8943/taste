import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  toastMessage: string;
}

/**
 * 모바일 앱(Capacitor)과 웹 브라우저를 통합 지원하는 GPS 위치 조회 함수
 */
export async function getUnifiedCurrentPosition(): Promise<{
  coords: LocationResult | null;
  error: LocationError | null;
}> {
  // 1. Capacitor 네이티브 모바일 앱 환경 (iOS / Android)
  if (Capacitor.isNativePlatform()) {
    try {
      // 위치 권한 확인 및 요청
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      }

      if (perm.location !== 'granted') {
        return {
          coords: null,
          error: {
            code: 'PERMISSION_DENIED',
            message: '기기 위치 권한이 허용되지 않았습니다.\n스마트폰 설정 > 앱 권한에서 위치 권한을 허용해 주시거나 아래에서 기준 지역을 선택해 주세요.',
            toastMessage: '위치 권한이 필요합니다. 설정에서 허용해 주세요.',
          },
        };
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      });

      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
      };
    } catch (err: unknown) {
      console.warn('Native geolocation error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        coords: null,
        error: {
          code: 'POSITION_UNAVAILABLE',
          message: `GPS 신호를 수신할 수 없습니다 (${errMsg}).\n아래에서 기준 지역을 직접 선택해 주세요.`,
          toastMessage: 'GPS 위치를 수신할 수 없습니다. 지역을 직접 선택해 주세요.',
        },
      };
    }
  }

  // 2. 일반 웹 브라우저 환경
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      coords: null,
      error: {
        code: 'NOT_SUPPORTED',
        message: '현재 사용 중인 브라우저가 위치 정보 서비스를 지원하지 않습니다.\n아래에서 기준 동네를 직접 선택해 주세요.',
        toastMessage: '위치 서비스를 지원하지 않는 브라우저입니다.',
      },
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          error: null,
        });
      },
      (err) => {
        let code: LocationError['code'] = 'UNKNOWN';
        let message = '알 수 없는 오류로 위치 정보를 가져오지 못했습니다.\n지역을 직접 선택해 주세요.';
        let toastMessage = '위치 정보를 가져오지 못했습니다. 지역을 직접 선택해 주세요.';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            code = 'PERMISSION_DENIED';
            message =
              '브라우저 위치 권한이 차단(거부)되었습니다.\n브라우저 주소창 설정에서 권한을 허용하시거나, 아래에서 원하시는 지역을 직접 선택해 주세요.';
            toastMessage = '위치 권한이 거부되었습니다. 지역을 직접 선택해 주세요.';
            break;
          case err.POSITION_UNAVAILABLE:
            code = 'POSITION_UNAVAILABLE';
            message =
              'GPS 신호를 수신할 수 없거나 현재 위치 정보를 확인할 수 없습니다.\n아래에서 기준 지역을 직접 선택해 주세요.';
            toastMessage = '현재 위치를 확인할 수 없습니다. 지역을 직접 선택해 주세요.';
            break;
          case err.TIMEOUT:
            code = 'TIMEOUT';
            message =
              '위치 확인 응답 시간이 초과되었습니다.\n다시 시도하거나 아래에서 지역을 직접 선택해 주세요.';
            toastMessage = '위치 확인 시간이 초과되었습니다. 지역을 직접 선택해 주세요.';
            break;
        }

        resolve({
          coords: null,
          error: { code, message, toastMessage },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );
  });
}
