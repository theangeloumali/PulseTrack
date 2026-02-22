// PulseTrack Service Worker
// Version 1.0.0

const CACHE_NAME = 'pulsetrack-v1';
const STATIC_CACHE_NAME = 'pulsetrack-static-v1';
const DYNAMIC_CACHE_NAME = 'pulsetrack-dynamic-v1';

// Define cache strategies for different resource types
const CACHE_STRATEGIES = {
  // Static assets - Cache first
  static: ['/', '/manifest.json', '/icon.png', '/app-logo.png'],

  // API routes - Network first with cache fallback
  api: ['/api/'],

  // Pages - Network first with cache fallback
  pages: ['/dashboard', '/tickets', '/login'],
};

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(CACHE_STRATEGIES.static);
      })
      .then(() => {
        console.log('✅ Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache static assets', error);
      }),
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated and old caches cleaned');
        return self.clients.claim();
      }),
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const {request} = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else if (isPageRequest(url.pathname)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    throw error;
  }
}

// Network-first strategy with cache fallback
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network-first with offline fallback for critical pages/API
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for pages
    if (isPageRequest(new URL(request.url).pathname)) {
      return getOfflineFallback();
    }

    // Return error response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No network connection available',
      }),
      {
        status: 503,
        headers: {'Content-Type': 'application/json'},
      },
    );
  }
}

// Generate offline fallback page
function getOfflineFallback() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PulseTrack - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background-color: #f9fafb;
          color: #374151;
        }
        .container {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }
        .icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          background-color: #6b7280;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }
        p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        button {
          background-color: #1f2937;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover {
          background-color: #374151;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>You're Offline</h1>
        <p>PulseTrack is available offline with limited functionality. Your data will sync when you're back online.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;

  return new Response(offlineHtml, {
    headers: {'Content-Type': 'text/html'},
  });
}

// Helper functions to determine request types
function isStaticAsset(pathname) {
  return (
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    pathname.includes('/icon.png') ||
    pathname.includes('/app-logo.png') ||
    pathname.includes('/manifest.json')
  );
}

function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

function isPageRequest(pathname) {
  return pathname.startsWith('/') && !isStaticAsset(pathname) && !isApiRequest(pathname);
}

// Background sync for offline actions (if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  // Implement background sync logic here
  // This could sync offline actions when connection is restored
  console.log('🔄 Service Worker: Performing background sync...');
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🎯 Service Worker: Loaded and ready!');
