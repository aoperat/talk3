import { useState, useEffect } from 'react';

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 브라우저 지원 확인
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('[PushNotification] Notifications not supported');
      alert('이 기기는 알림을 지원하지 않습니다.');
      return false;
    }

    if (permission === 'granted') {
      console.log('[PushNotification] Permission already granted');
      return true;
    }

    if (permission === 'denied') {
      console.warn('[PushNotification] Permission denied');
      alert('알림 권한이 거부되었습니다.\n\nPWA 앱을 삭제하고 다시 설치한 후 알림 권한을 다시 요청해보세요.');
      return false;
    }

    try {
      console.log('[PushNotification] Requesting permission...');
      const result = await Notification.requestPermission();
      console.log('[PushNotification] Permission result:', result);
      setPermission(result);
      
      if (result === 'granted') {
        console.log('[PushNotification] Permission granted successfully');
        // iOS PWA: Service Worker가 준비되었는지 확인
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            console.log('[PushNotification] Service Worker ready:', registration);
          } catch (error) {
            console.error('[PushNotification] Service Worker not ready:', error);
          }
        }
        return true;
      } else {
        console.warn('[PushNotification] Permission denied or default');
        return false;
      }
    } catch (error) {
      console.error('[PushNotification] Error requesting permission:', error);
      alert('알림 권한 요청 중 오류가 발생했습니다.');
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('[PushNotification] Cannot show notification:', { isSupported, permission });
      return;
    }

    // iOS PWA 최적화: Service Worker를 통한 알림이 더 안정적
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          console.log('[PushNotification] Showing notification via Service Worker');
          return registration.showNotification(title, {
            ...options,
            icon: '/talk3/icon-192.png',
            badge: '/talk3/icon-192.png',
            requireInteraction: false,
            silent: false,
            tag: options?.tag || 'message', // 같은 태그의 알림은 하나만 표시
          });
        })
        .then(() => {
          console.log('[PushNotification] Notification shown successfully');
        })
        .catch((error) => {
          console.error('[PushNotification] Error showing notification via SW:', error);
          // Service Worker가 실패하면 직접 알림 표시 (fallback)
          try {
            const notification = new Notification(title, {
              ...options,
              icon: '/talk3/icon-192.png',
              badge: '/talk3/icon-192.png',
            });
            console.log('[PushNotification] Notification shown directly (fallback)');
            return notification;
          } catch (err) {
            console.error('[PushNotification] Error showing notification:', err);
          }
        });
    } else {
      // Service Worker가 없으면 직접 알림 표시
      try {
        const notification = new Notification(title, {
          ...options,
          icon: '/talk3/icon-192.png',
          badge: '/talk3/icon-192.png',
        });
        console.log('[PushNotification] Notification shown directly (no SW)');
        return notification;
      } catch (error) {
        console.error('[PushNotification] Error showing notification:', error);
      }
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}

