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
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[PushNotification] Error requesting permission:', error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('[PushNotification] Cannot show notification:', { isSupported, permission });
      return;
    }

    // Service Worker를 통해 알림 표시
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          ...options,
          icon: '/talk3/icon-192.png',
          badge: '/talk3/icon-192.png',
          requireInteraction: false,
          silent: false,
        });
      }).catch((error) => {
        console.error('[PushNotification] Error showing notification via SW:', error);
        // Service Worker가 실패하면 직접 알림 표시
        try {
          new Notification(title, {
            ...options,
            icon: '/talk3/icon-192.png',
            badge: '/talk3/icon-192.png',
          });
        } catch (err) {
          console.error('[PushNotification] Error showing notification:', err);
        }
      });
    } else {
      // Service Worker가 없으면 직접 알림 표시
      try {
        new Notification(title, {
          ...options,
          icon: '/talk3/icon-192.png',
          badge: '/talk3/icon-192.png',
        });
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

