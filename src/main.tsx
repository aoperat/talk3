import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service Worker 등록 (알림을 위해 먼저 등록)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/talk3/sw.js', { scope: '/talk3/' })
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[Main] Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

