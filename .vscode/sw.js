// sw.js - Service Worker para Uñas Mágicas

const CACHE_NAME = 'unas-magicas-v1';
const urlsToCache = [
  '/tuturno/',
  '/tuturno/index.html',
  '/tuturno/admin.html',
  '/tuturno/app.js',
  '/tuturno/admin-app.js',
  '/tuturno/manifest.json',
  '/tuturno/utils/api.js',
  '/tuturno/utils/timeLogic.js',
  '/tuturno/components/Header.js',
  '/tuturno/components/WelcomeScreen.js',
  '/tuturno/components/ServiceSelection.js',
  '/tuturno/components/Calendar.js',
  '/tuturno/components/TimeSlots.js',
  '/tuturno/components/BookingForm.js',
  '/tuturno/components/Confirmation.js',
  '/tuturno/components/WhatsAppButton.js',
  'https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js',
  'https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js',
  'https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css'
];

// Instalación
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación
self.addEventListener('activate', event => {
  console.log('Service Worker activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Cache viejo eliminado:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE'
          });
        });
      });
      return self.clients.claim();
    })
  );
});

// Estrategia de cache
self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/tuturno/index.html');
            }
          });
      })
  );
});