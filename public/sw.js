// Service Worker for update detection
// 버전을 변경하면 새 버전으로 인식됩니다
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `messenger-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'messenger-runtime';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Check for updates by fetching the main HTML
    fetch('/', { cache: 'no-store' })
      .then((response) => {
        if (response.ok) {
          // Notify all clients about update availability
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'UPDATE_AVAILABLE',
                timestamp: Date.now(),
              });
            });
          });
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Update check failed:', error);
      });
  }
  
  // Show notification from client
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    console.log('[Service Worker] Showing notification:', title, options);
    self.registration.showNotification(title, {
      ...options,
      icon: options.icon || '/talk3/icon-192.png',
      badge: options.badge || '/talk3/icon-192.png',
      requireInteraction: false,
      silent: false,
      // iOS PWA 최적화
      tag: options.tag || 'message',
      renotify: true,
      vibrate: [200, 100, 200], // iOS에서는 무시될 수 있음
    }).then(() => {
      console.log('[Service Worker] Notification shown successfully');
    }).catch((error) => {
      console.error('[Service Worker] Error showing notification:', error);
    });
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.data);
  event.notification.close();
  
  const data = event.notification.data;
  const roomId = data?.roomId;
  const urlToOpen = roomId ? `/talk3/?room=${roomId}` : '/talk3/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window/tab open
      for (let client of clients) {
        // iOS PWA: URL이 포함된 모든 클라이언트 확인
        if (client.url.includes('/talk3/') || client.url.includes('talk3')) {
          // 기존 창에 메시지 전송하여 방으로 이동
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            roomId: roomId,
          });
          // iOS PWA: focus()가 실패할 수 있으므로 try-catch
          try {
            if ('focus' in client && typeof client.focus === 'function') {
              return client.focus();
            }
          } catch (error) {
            console.error('[Service Worker] Error focusing client:', error);
          }
        }
      }
      // If not, open a new window/tab
      if (self.clients.openWindow) {
        console.log('[Service Worker] Opening new window:', urlToOpen);
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

