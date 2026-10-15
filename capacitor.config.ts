import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dongnae.taste',
  appName: '동네식당',
  webDir: 'public',
  server: {
    // Vercel 프로덕션 배포 주소와 실시간 연동 (앱 심사 없이 실시간 웹/앱 동시 업데이트 지원)
    url: 'https://taste-dr8l.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
