/* global importScripts, firebase */

// Firebase Messaging용 Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

// 환경변수를 직접 쓸 수 없으므로, 필요하면 빌드 시 치환하거나
// Firebase 콘솔에서 제공하는 값을 그대로 넣어 사용합니다.
// TODO: 아래 값을 실제 Firebase 웹 앱 설정 값으로 교체하세요.
firebase.initializeApp({
    apiKey: 'AIzaSyDIzpdskEBwwxDEajMVvmF8yLEdO9u3N1g',
    projectId: 'msg2-a35ea',
    messagingSenderId: '778214055582',
    appId: '1:778214055582:web:40eb26b99e82b0af0ba58f',
  });

const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage(function (payload) {
  console.log('[FCM] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/talk3/icon-192.png',
    badge: '/talk3/icon-192.png',
    data: payload.data || undefined,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


