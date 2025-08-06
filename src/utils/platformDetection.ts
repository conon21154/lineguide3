// 플랫폼 감지 유틸리티

export const isMobileDevice = (): boolean => {
  // User Agent를 통한 모바일 기기 감지
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // 모바일 기기 User Agent 패턴
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i
  ];
  
  return mobilePatterns.some(pattern => pattern.test(userAgent));
};

export const isWebApp = (): boolean => {
  // PWA나 웹앱으로 실행 중인지 확인
  if ('standalone' in window.navigator && (window.navigator as any).standalone) {
    return true; // iOS Safari에서 홈 화면에 추가된 PWA
  }
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true; // 웹 앱 매니페스트의 display-mode가 standalone인 경우
  }
  
  return false;
};

export const isMobileApp = (): boolean => {
  // 모바일 기기이면서 웹앱 환경이거나 화면 폭이 768px 이하인 경우를 모바일 앱으로 간주
  const mobile = isMobileDevice();
  const webApp = isWebApp();
  const narrowScreen = window.innerWidth <= 768;
  const result = mobile && (webApp || narrowScreen);
  
  // 디버깅을 위한 로그
  console.log('🔍 Platform Detection:', {
    isMobileDevice: mobile,
    isWebApp: webApp,
    screenWidth: window.innerWidth,
    narrowScreen,
    isMobileApp: result
  });
  
  return result;
};

export const isDesktopWeb = (): boolean => {
  // 데스크톱 웹 브라우저 환경
  return !isMobileDevice() || (!isWebApp() && window.innerWidth > 768);
};

export const getDefaultHomePage = (): string => {
  // 환경에 따른 기본 홈페이지 결정
  if (isMobileApp()) {
    return '/workboard'; // 모바일 앱: 작업게시판
  } else {
    return '/'; // 데스크톱 웹: 대시보드
  }
};

// 디버깅용 환경 정보 출력
export const logPlatformInfo = () => {
  console.log('🔍 Platform Detection Info:');
  console.log('- User Agent:', navigator.userAgent);
  console.log('- Window Size:', `${window.innerWidth}x${window.innerHeight}`);
  console.log('- Is Mobile Device:', isMobileDevice());
  console.log('- Is Web App:', isWebApp());
  console.log('- Is Mobile App:', isMobileApp());
  console.log('- Is Desktop Web:', isDesktopWeb());
  console.log('- Default Home Page:', getDefaultHomePage());
};