import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Service Worker 등록 및 업데이트 감지
    if ('serviceWorker' in navigator) {
      let registration: ServiceWorkerRegistration | null = null;

      navigator.serviceWorker
        .register('/talk3/sw.js', { scope: '/talk3/' })
        .then((reg) => {
          registration = reg;
          console.log('[UpdateNotification] Service Worker registered');

          // 주기적으로 업데이트 확인
          const checkUpdate = () => {
            if (registration?.waiting) {
              // 업데이트가 대기 중이면 알림 표시
              setShowUpdate(true);
            } else if (registration?.installing) {
              // 설치 중이면 설치 완료 후 알림 표시
              registration.installing.addEventListener('statechange', () => {
                if (registration?.waiting) {
                  setShowUpdate(true);
                }
              });
            }
          };

          // 초기 확인
          checkUpdate();

          // 업데이트 확인 주기 설정 (5분마다)
          const updateInterval = setInterval(() => {
            registration?.update();
            checkUpdate();
          }, 5 * 60 * 1000);

          // Service Worker 업데이트 이벤트 감지
          reg.addEventListener('updatefound', () => {
            console.log('[UpdateNotification] New service worker found');
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 새 버전이 설치되었고, 현재 페이지가 제어 중이면
                  setShowUpdate(true);
                }
              });
            }
          });

          // 메시지 리스너 (Service Worker에서 업데이트 알림)
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
              setShowUpdate(true);
            }
          });

          return () => {
            clearInterval(updateInterval);
          };
        })
        .catch((error) => {
          console.error('[UpdateNotification] Service Worker registration failed:', error);
        });

      // 페이지 포커스 시 업데이트 확인
      const handleFocus = () => {
        if (registration) {
          registration.update();
        }
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Service Worker에게 업데이트 적용 요청
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // Service Worker가 없으면 일반 새로고침
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-indigo-600 text-white shadow-lg animate-slideDown" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-bold text-sm">새 버전이 사용 가능합니다</p>
            <p className="text-xs text-indigo-100">업데이트하여 최신 기능을 사용하세요</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>업데이트 중...</span>
              </>
            ) : (
              <span>업데이트</span>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-white hover:bg-indigo-700 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

