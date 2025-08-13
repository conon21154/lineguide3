// LineGuide PWA Service Worker
const CACHE_NAME = 'lineguide-v1.0.0';
const OFFLINE_URL = '/offline.html';

// 캐시할 핵심 리소스
const STATIC_CACHE_URLS = [
  './',
  './offline.html',
  './manifest.json',
  // 핵심 라우트들  
  './workboard',
  './board', 
  './dashboard',
  './label-printer',
  // 정적 자산들은 런타임에 추가
];

// 라벨프린터는 항상 오프라인에서 작동해야 함
const OFFLINE_FALLBACK_PAGES = [
  '/label-printer'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 캐시 생성 완료');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker 설치 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('✅ Service Worker 활성화 완료');
      return self.clients.claim(); // 즉시 제어권 획득
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Chrome 확장프로그램 요청 무시
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

// 요청 처리 로직
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 네트워크 우선 전략 (Network First)
    // API 요청이나 동적 콘텐츠는 항상 최신 데이터 시도
    if (url.pathname.startsWith('/api/') || 
        url.pathname.includes('github.io') ||
        url.pathname.includes('render.com')) {
      
      try {
        const networkResponse = await fetch(request);
        
        // 성공하면 캐시 업데이트
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // 네트워크 실패 시 캐시에서 반환
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📱 오프라인: 캐시에서 반환', url.pathname);
          return cachedResponse;
        }
        throw error;
      }
    }
    
    // 2. 캐시 우선 전략 (Cache First)  
    // 정적 자산들은 캐시 우선
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져와서 캐시
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('❌ 네트워크 오류:', url.pathname, error);
    
    // 오프라인 폴백 페이지들
    if (OFFLINE_FALLBACK_PAGES.some(page => url.pathname.includes(page))) {
      // 라벨프린터 등은 캐시된 버전 반환
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // HTML 페이지 요청이면 오프라인 페이지 반환
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlineResponse = await caches.match(OFFLINE_URL);
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // 그 외에는 에러 던지기
    throw error;
  }
}

// 백그라운드 동기화 (향후 확장용)
self.addEventListener('sync', (event) => {
  console.log('🔄 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-upload') {
    event.waitUntil(uploadPendingData());
  }
});

// 대기 중인 데이터 업로드 (향후 카메라 기능용)
async function uploadPendingData() {
  console.log('📤 대기 중인 데이터 업로드 시도...');
  // 향후 IndexedDB에서 대기 중인 사진/메모 업로드
}

// 푸시 알림 (향후 확장용)
self.addEventListener('push', (event) => {
  console.log('🔔 푸시 알림 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 작업지시가 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'lineguide-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification('LineGuide', options)
  );
});