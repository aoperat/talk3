import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

let messagingInstance: Messaging | null = null;

export function getFirebaseMessaging(): Messaging | null {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;

    if (!apiKey || !projectId || !messagingSenderId || !appId) {
      console.warn('[Firebase] 환경변수가 설정되지 않아 FCM을 비활성화합니다.');
      return null;
    }

    if (!messagingInstance) {
      const app = initializeApp({
        apiKey,
        projectId,
        messagingSenderId,
        appId,
      });
      messagingInstance = getMessaging(app);
      console.log('[Firebase] Messaging 초기화 완료');
    }

    return messagingInstance;
  } catch (error) {
    console.error('[Firebase] Messaging 초기화 실패:', error);
    return null;
  }
}

export async function getFcmToken(): Promise<string | null> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[Firebase] VITE_FCM_VAPID_KEY가 설정되지 않았습니다.');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    if (!token) {
      console.warn('[FCM] 토큰을 받아오지 못했습니다.');
      return null;
    }
    console.log('[FCM] 클라이언트 토큰:', token);
    return token;
  } catch (error) {
    console.error('[FCM] getToken 중 오류:', error);
    return null;
  }
}

export function subscribeForegroundMessages(
  handler: (payload: any) => void
): () => void {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message:', payload);
    handler(payload);
  });

  return unsubscribe;
}


