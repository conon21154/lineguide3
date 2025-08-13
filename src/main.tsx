import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Service Worker 등록 및 PWA 설치 프롬프트
if ('serviceWorker' in navigator) {
  let deferredPrompt: any;
  
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker 등록 성공:', registration.scope);
      
      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker 업데이트 발견');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ 새 버전이 준비되었습니다');
              // 새버전 알림 배너 표시
              showUpdateBanner();
            }
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Service Worker 등록 실패:', error);
    }
  });

  // PWA 설치 프롬프트 이벤트 처리
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  // PWA 설치 배너 표시
  function showInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 500px; margin: 0 auto;">
        <span style="font-size: 14px;">📱 LineGuide를 홈화면에 추가하세요!</span>
        <div>
          <button id="install-btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; margin-right: 8px; cursor: pointer;">설치</button>
          <button id="dismiss-btn" style="background: transparent; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // 애니메이션으로 표시
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);
    
    // 설치 버튼 클릭
    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA 설치 결과: ${outcome}`);
        deferredPrompt = null;
        banner.remove();
      }
    });
    
    // 닫기 버튼 클릭
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 300);
    });
    
    // 5초 후 자동 숨김
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => banner.remove(), 300);
      }
    }, 5000);
  }

  // 업데이트 배너 표시
  function showUpdateBanner() {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      transform: translateY(100px);
      transition: transform 0.3s ease;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px;">✨ 새로운 업데이트가 준비되었습니다</span>
        <button onclick="window.location.reload()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">새로고침</button>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.PROD ? "/lineguide3" : ""}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)