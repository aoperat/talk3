import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { user } = useAuth();

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
      return;
    }

    // Service Worker를 통해 알림 표시
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          ...options,
          icon: '/talk3/icon-192.png',
          badge: '/talk3/icon-192.png',
        },
      });
    } else {
      // Service Worker가 없으면 직접 알림 표시
      new Notification(title, {
        ...options,
        icon: '/talk3/icon-192.png',
        badge: '/talk3/icon-192.png',
      });
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}

