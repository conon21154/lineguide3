// 날짜 유효성 검사 및 표시 유틸리티

/**
 * 안전한 날짜 표시 - 1970년 오류 방지
 */
export const formatSafeDate = (
  dateValue: string | number | Date | null | undefined,
  options?: {
    showTime?: boolean;
    fallback?: string;
    locale?: string;
  }
): string => {
  const { showTime = false, fallback = '—', locale = 'ko-KR' } = options || {};
  
  // null, undefined, 빈 문자열 체크
  if (!dateValue || dateValue === '' || dateValue === '0' || dateValue === 0) {
    return fallback;
  }
  
  try {
    const date = new Date(dateValue);
    
    // 유효하지 않은 날짜 체크 (NaN, Invalid Date)
    if (isNaN(date.getTime())) {
      return fallback;
    }
    
    // 1970년대 이전 날짜 방지 (Unix 타임스탬프 오류 방지)
    if (date.getFullYear() < 1980) {
      return fallback;
    }
    
    // 미래 날짜 방지 (100년 후까지만 허용)
    const now = new Date();
    const futureLimit = new Date(now.getFullYear() + 100, 11, 31);
    if (date.getTime() > futureLimit.getTime()) {
      return fallback;
    }
    
    if (showTime) {
      return date.toLocaleString(locale);
    } else {
      return date.toLocaleDateString(locale);
    }
  } catch (error) {
    console.warn('날짜 포맷팅 오류:', error, 'dateValue:', dateValue);
    return fallback;
  }
};

/**
 * 상대적 시간 표시 (예: "2시간 전", "3일 전")
 */
export const formatRelativeTime = (
  dateValue: string | number | Date | null | undefined,
  options?: { fallback?: string; locale?: string }
): string => {
  const { fallback = '—', locale = 'ko-KR' } = options || {};
  
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime()) || date.getFullYear() < 1980) {
      return fallback;
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    
    // 30일 이상은 절대 날짜로 표시
    return date.toLocaleDateString(locale);
  } catch (error) {
    console.warn('상대시간 포맷팅 오류:', error);
    return fallback;
  }
};

/**
 * KST 타임존으로 날짜 변환
 */
export const toKST = (dateValue: string | number | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    
    // KST는 UTC+9
    const kstOffset = 9 * 60 * 60 * 1000;
    return new Date(date.getTime() + kstOffset);
  } catch {
    return null;
  }
};

/**
 * ISO 문자열을 KST로 변환하여 표시
 */
export const formatKSTDate = (
  dateValue: string | number | Date | null | undefined,
  showTime: boolean = true
): string => {
  // 디버깅을 위한 로그 (개발 환경에서만)
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!dateValue || dateValue === null || dateValue === undefined || dateValue === '') {
    // 개발 환경에서만 과도한 로그 방지
    if (isDev && Math.random() < 0.1) { // 10% 확률로만 로그
      console.log('🔍 formatKSTDate: 빈 값 입력 (샘플링):', dateValue);
    }
    return showTime ? '날짜/시간 없음' : '날짜 없음';
  }
  
  try {
    // 날짜 파싱
    let date: Date;
    
    // ISO 문자열 형태일 때 특별 처리
    if (typeof dateValue === 'string') {
      // UTC 시간인지 확인 (Z 또는 +00:00 등)
      if (dateValue.includes('Z') || dateValue.includes('+') || dateValue.includes('-')) {
        date = new Date(dateValue);
      } else {
        // 로컬 시간으로 가정하고 파싱
        date = new Date(dateValue + (dateValue.includes('T') ? '' : 'T00:00:00'));
      }
    } else {
      date = new Date(dateValue);
    }
    
    // 유효하지 않은 날짜 체크
    if (isNaN(date.getTime())) {
      if (isDev) console.warn('🔍 formatKSTDate: 유효하지 않은 날짜:', dateValue);
      return '—';
    }
    
    // 1980년 이전 날짜 방지 (단, 디버깅을 위해 경고만)
    if (date.getFullYear() < 1980) {
      if (isDev) console.warn('🔍 formatKSTDate: 1980년 이전 날짜 감지:', dateValue, '→', date);
      return '—';
    }
    
    // KST 옵션으로 포맷팅
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    if (showTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit'; // 초도 표시
      options.hour12 = false; // 24시간 형식
    }
    
    const result = new Intl.DateTimeFormat('ko-KR', options).format(date);
    return result;
  } catch (error) {
    if (isDev) console.warn('🔍 formatKSTDate: KST 날짜 포맷팅 오류:', error, 'dateValue:', dateValue);
    return '—';
  }
};