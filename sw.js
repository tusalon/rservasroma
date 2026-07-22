// sw.js - Service Worker para Rservasroma

const CACHE_NAME = 'rservasroma-v52';
const BASE = '/rservasroma';

const urlsToCache = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/app-clientes.html`,
  `${BASE}/admin.html`,
  `${BASE}/admin-login.html`,
  `${BASE}/offline-panel.html`,
  `${BASE}/calendar.html`,
  `${BASE}/setup-wizard.html`,
  `${BASE}/editar-negocio.html`,
  `${BASE}/manifest.json`,

  // App principal
  `${BASE}/client-app.js?v=20260721-cliente-multinegocio`,
  `${BASE}/admin-app.js?v=20260721-admin-push-v2`,

  // Utils
  `${BASE}/utils/api.js?v=20260722-lista-espera-cliente`,
  `${BASE}/utils/auth-clients.js`,
  `${BASE}/utils/auth-profesionales.js`,
  `${BASE}/utils/config.js`,
  `${BASE}/utils/client-native-links.js?v=20260721-native-origin-v1`,
  `${BASE}/utils/dias-cerrados.js`,
  `${BASE}/utils/hero-backgrounds.js`,
  `${BASE}/utils/native-push-notifications.js?v=20260722-platform-v4`,
  `${BASE}/utils/offline-panel.js`,
  `${BASE}/utils/config-negocio-master.js?v=20260721-pwa-slug-v3`,
  `${BASE}/utils/i18n.js`,
  `${BASE}/utils/phone-utils.js`,
  `${BASE}/utils/profesionales.js`,
  `${BASE}/utils/push-config.js?v=20260717-push-activo`,
  `${BASE}/utils/push-notifications.js?v=20260722-platform-v4`,
  `${BASE}/utils/servicios.js`,
  `${BASE}/utils/storage.js`,
  `${BASE}/utils/suscripcion.js?v=20260721-fecha-local`,
  `${BASE}/utils/supabase-config.js`,
  `${BASE}/utils/timeLogic.js`,
  `${BASE}/utils/whatsapp-helper.js?v=20260722-lista-espera-cliente`,
  `${BASE}/utils/legacy-ios-fallback.css`,

  // Componentes cliente
  `${BASE}/components/BookingForm.js`,
  `${BASE}/components/Calendar.js`,
  `${BASE}/components/ClientAuthScreen.js?v=20260721-cliente-multinegocio`,
  `${BASE}/components/Confirmation.js`,
  `${BASE}/components/Header.js`,
  `${BASE}/components/InstallButton.js`,
  `${BASE}/components/MultiProfesionalSelector.js`,
  `${BASE}/components/MultiTimeSlots.js`,
  `${BASE}/components/MyBookings.js?v=20260721-admin-push-v2`,
  `${BASE}/components/ProfesionalSelector.js`,
  `${BASE}/components/ServiceSelectionCategorias.js`,
  `${BASE}/components/TimeSlots.js`,
  `${BASE}/components/WelcomeScreen.js?v=20260721-client-native`,
  `${BASE}/components/WhatsAppButton.js`,

  // Componentes admin
  `${BASE}/components/admin/ConfigPanel.js`,
  `${BASE}/components/admin/EditarNegocio.js`,
  `${BASE}/components/admin/HorariosPorDiaPanel.js`,
  `${BASE}/components/admin/HorariosExcepcionPanel.js`,
  `${BASE}/components/admin/ProfesionalesPanel.js`,
  `${BASE}/components/admin/ImportarServicios.js`,
  `${BASE}/components/admin/ServiciosPanelCategorias.js`,
  `${BASE}/components/admin/SetupWizard.js`,

  // Vendors
  `${BASE}/vendor/react.production.min.js`,
  `${BASE}/vendor/react-dom.production.min.js`,
  `${BASE}/vendor/babel.min.js`,
  `${BASE}/vendor/bcrypt.min.js`,
  `${BASE}/vendor/tailwind-browser.js`,
  `${BASE}/vendor/lucide/lucide.css`,
  `${BASE}/vendor/lucide/lucide.woff2`,

  // Iconos
  `${BASE}/icons/icon-72x72.png`,
  `${BASE}/icons/icon-96x96.png`,
  `${BASE}/icons/icon-128x128.png`,
  `${BASE}/icons/icon-144x144.png`,
  `${BASE}/icons/icon-152x152.png`,
  `${BASE}/icons/icon-192x192.png`,
  `${BASE}/icons/icon-384x384.png`,
  `${BASE}/icons/icon-512x512.png`,
  `${BASE}/icons/badge.svg`,
];

// URLs externas — nunca interceptar
const BYPASS = [
  'supabase.co',
  'ntfy.sh',
  'unsplash.com',
  'wa.me',
  'api.whatsapp.com',
  'whatsapp.com',
  'cdn.',
  'unpkg.com',
  'trickle.so',
];

// ============================================
// INSTALACIÓN
// ============================================
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Error al cachear:', err))
  );
});

// ============================================
// ACTIVACIÓN — limpia caches anteriores
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH
// - Documentos HTML (navegación): RED PRIMERO, caché como respaldo offline.
//   Cache-first aquí retrasaba cualquier arreglo de lógica crítica (el gate
//   de index.html que decide admin-login vs app de clientas) hasta que el
//   dispositivo revalidara el SW en segundo plano — podía tardar varias
//   aperturas de la app, o sobrevivir incluso a una actualización del APK
//   (el WebView conserva su caché entre versiones). Con red primero, el
//   HTML llega actualizado de inmediato mientras haya conexión.
// - Todo lo demás (JS, CSS, imágenes): Cache First, sin cambios.
// ============================================
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (BYPASS.some(b => event.request.url.includes(b))) return;
  if (event.request.method !== 'GET') return;

  // Manifest dinámico por salón — sin blob URLs. La app de clientas y la
  // administrativa (mode=admin) tienen id y start_url distintos para que un
  // mismo salón pueda tener instaladas ambas sin que una sustituya a la otra.
  const reqUrl = new URL(event.request.url);
  if (reqUrl.pathname === `${BASE}/manifest.json` && reqUrl.searchParams.has('s')) {
    const slug   = reqUrl.searchParams.get('s') || '';
    const nombre = reqUrl.searchParams.get('n') || slug;
    const esAdmin = reqUrl.searchParams.get('mode') === 'admin';
    const BASE_URL = 'https://tusalon.github.io' + BASE;
    const appUrl = esAdmin
      ? BASE_URL + '/admin.html?s=' + encodeURIComponent(slug)
      : BASE_URL + '/?s=' + encodeURIComponent(slug);
    const manifest = {
      id: appUrl,
      name: nombre,
      short_name: nombre.split(/\s+/).slice(0, 2).join(' '),
      description: esAdmin
        ? 'Panel de administración de ' + nombre
        : 'Reserva tu turno online en ' + nombre,
      start_url: appUrl,
      scope: BASE_URL + '/',
      display: 'standalone',
      theme_color: '#FF1493',
      background_color: '#1A1A1A',
      icons: [
        { src: BASE_URL + '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: BASE_URL + '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };

    if (!esAdmin) {
      // Android: mantener presionado el ícono → acceso directo a Mis Citas.
      manifest.shortcuts = [
        {
          name: 'Mis Citas',
          short_name: 'Mis Citas',
          url: BASE_URL + '/?s=' + encodeURIComponent(slug) + '&ir=citas',
          icons: [{ src: BASE_URL + '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
        }
      ];
    }
    event.respondWith(new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' }
    }));
    return;
  }

  // Documento HTML (navegación real del navegador/WebView): red primero.
  const esNavegacion = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (esNavegacion) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || new Response('Sin conexión', { status: 408 })))
    );
    return;
  }

  const esAssetCriticoAdmin = [
    `${BASE}/admin-app.js`,
    `${BASE}/utils/config-negocio-master.js`,
    `${BASE}/utils/native-push-notifications.js`,
    `${BASE}/utils/push-notifications.js`
  ].some(path => reqUrl.pathname === path);

  if (esAssetCriticoAdmin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || new Response('Sin conexiÃ³n', { status: 408 })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          return caches.match(`${BASE}/icons/icon-192x192.png`);
        }
        return new Response('Sin conexión', { status: 408 });
      });
    })
  );
});

// ============================================
// MENSAJES
// ============================================
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});

// ============================================
// WEB PUSH
// ============================================
// Numerito sobre el ícono de la app instalada (PWA en Android Chrome e iOS
// 16.4+). El conteo es el número real de notificaciones del sistema aún sin
// abrir de este SW — se recalcula solas, sin contador aparte que se desincronice.
async function actualizarBadgeApp() {
  try {
    if (!navigator.setAppBadge) return;
    const activas = await self.registration.getNotifications();
    if (activas.length > 0) await navigator.setAppBadge(activas.length);
    else if (navigator.clearAppBadge) await navigator.clearAppBadge();
  } catch (e) { /* Badging API no soportada en esta plataforma */ }
}

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'RservasRoma', body: event.data ? event.data.text() : 'Nueva notificación' };
  }

  event.waitUntil((async () => {
    await self.registration.showNotification(payload.title || 'RservasRoma', {
      body: payload.body || 'Tienes una nueva notificación',
      icon: `${BASE}/icons/icon-192x192.png`,
      badge: `${BASE}/icons/badge.svg`,
      tag: payload.tag || 'rservasroma',
      data: { url: payload.url || `https://tusalon.github.io${BASE}/admin.html`, ...(payload.data || {}) },
    });
    await actualizarBadgeApp();
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let targetUrl = event.notification?.data?.url || `${BASE}/`;
  // Si la URL es relativa, convertirla a absoluta usando el scope del SW
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
    const scope = self.registration.scope || `https://tusalon.github.io${BASE}/`;
    targetUrl = scope.replace(/\/$/, '') + (targetUrl === '/' ? '' : targetUrl);
  }
  event.waitUntil((async () => {
    await actualizarBadgeApp();
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.includes(targetUrl) && 'focus' in c) { await c.focus(); return; }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
