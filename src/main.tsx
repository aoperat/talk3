import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service Worker 등록 (알림을 위해 먼저 등록)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 로컬 개발: /sw.js, 프로덕션: /talk3/sw.js
    const swPath = import.meta.env.PROD ? '/talk3/sw.js' : '/sw.js';
    const swScope = import.meta.env.PROD ? '/talk3/' : '/';
    
    navigator.serviceWorker
      .register(swPath, { scope: swScope })
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[Main] Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Strict Mode 비활성화 (Realtime 구독 문제 해결)
  <App />
)

