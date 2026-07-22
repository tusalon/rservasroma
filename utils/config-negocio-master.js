// utils/config-negocio-master.js
// 🏆 VERSIÓN MAESTRA — un solo repo para todos los salones Rservasroma
// Reemplaza el config-negocio.js hardcodeado de cada cliente.
// Detecta el slug desde la URL y resuelve el negocio_id automáticamente.

console.log('🌐 config-negocio-master.js cargado');

// ============================================================
// 1. DETECCIÓN DE SLUG DESDE LA URL
// ============================================================
(function() {
    const ADMIN_SEGMENTS = new Set([
        'admin', 'admin.html',
        'admin-login', 'admin-login.html',
        'setup-wizard', 'setup-wizard.html',
        'calendar', 'calendar.html',
        'offline-panel', 'offline-panel.html',
        'editar-negocio', 'editar-negocio.html',
        'mensaje-cliente', 'mensaje-cliente.html',
    ]);

    function getSlugFromURL() {
        // Después del redirect de 404.html → /?s=slug
        const params = new URLSearchParams(window.location.search);
        const s = params.get('s');
        if (s && s.length > 0) return s.toLowerCase().trim();

        // Ruta directa: app.rservasroma.com/lecisnails/...
        const parts = window.location.pathname.replace(/^\//, '').split('/').filter(Boolean);
        if (parts.length > 0 && !ADMIN_SEGMENTS.has(parts[0]) && !parts[0].includes('.')) {
            return parts[0].toLowerCase().trim();
        }
        return null;
    }

    window._rservasSlugActual = getSlugFromURL();
    console.log('🔍 Slug detectado:', window._rservasSlugActual || '(ninguno — modo admin o raíz)');
})();

function getNombreNegocioGuardadoPorSlug(slug = window._rservasSlugActual) {
    const actual = String(slug || '').toLowerCase().trim();
    if (!actual) return '';
    try {
        const scoped = localStorage.getItem('negocioNombre:' + actual) || '';
        if (scoped) return scoped;
        const slugGuardado = String(localStorage.getItem('negocioSlug') || '').toLowerCase().trim();
        return slugGuardado === actual ? (localStorage.getItem('negocioNombre') || '') : '';
    } catch (error) {
        return '';
    }
}

function guardarNombreNegocioPorSlug(slug, nombre) {
    const actual = String(slug || '').toLowerCase().trim();
    const valor = String(nombre || '').trim();
    if (!actual || !valor) return;
    localStorage.setItem('negocioNombre:' + actual, valor);
    localStorage.setItem('negocioNombre', valor);
}

window.getNombreNegocioGuardadoPorSlug = getNombreNegocioGuardadoPorSlug;

// ============================================================
// 2. RESOLUCIÓN SINCRÓNICA DEL NEGOCIO_ID
//    Admin: lee localStorage (seteado por admin-login.html)
//    Cliente: lee caché localStorage; si no existe, fetch async
// ============================================================
(function() {
    const slug = window._rservasSlugActual;

    // — Ruta ADMIN: negocioId ya está en localStorage tras el login —
    if (!slug) {
        const storedId = localStorage.getItem('negocioId') || '';
        window.NEGOCIO_ID_POR_DEFECTO = storedId;
        window._negocioIdResuelto = !!storedId;
        if (storedId) console.log('✅ [admin] negocio_id desde localStorage:', storedId);
        else console.warn('⚠️ [admin] Sin negocioId en localStorage. Redirigir a login.');
        return;
    }

    // — Ruta CLIENTE: buscar en caché de 24 h —
    const CACHE_ID_KEY  = 'rsmid_' + slug; // rservasroma master id
    const CACHE_TTL_KEY = 'rsmttl_' + slug;
    const cachedId  = localStorage.getItem(CACHE_ID_KEY);
    const cachedTTL = parseInt(localStorage.getItem(CACHE_TTL_KEY) || '0');
    const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

    if (cachedId && (Date.now() - cachedTTL) < CACHE_MAX_AGE) {
        window.NEGOCIO_ID_POR_DEFECTO = cachedId;
        window._negocioIdResuelto = true;
        console.log('✅ [cliente] negocio_id desde caché:', cachedId, '(slug:', slug + ')');
        // Refrescar caché en background cada 24 h
        window._negocioSlugCacheRefresh = { slug, CACHE_ID_KEY, CACHE_TTL_KEY };
        return;
    }

    // — Primera visita del cliente: fetch async + señal de "cargando" —
    console.log('⏳ [cliente] Primer acceso, resolviendo negocio_id para slug:', slug);
    window.NEGOCIO_ID_POR_DEFECTO = '';
    window._negocioIdResuelto = false;
    window._negocioSlugPendiente = { slug, CACHE_ID_KEY, CACHE_TTL_KEY };

    // La promesa se resuelve antes de que cargarConfiguracionNegocio la necesite
    window._negocioResolvePromise = (async function() {
        try {
            const url = `${window.SUPABASE_URL}/rest/v1/negocios?slug=eq.${encodeURIComponent(slug)}&select=id,slug,nombre`;
            const res = await fetch(url, {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const negocio = data[0];
            if (!negocio) {
                console.error('❌ Slug no encontrado en Supabase:', slug);
                return null;
            }
            const id = negocio.id;
            localStorage.setItem(CACHE_ID_KEY, id);
            localStorage.setItem(CACHE_TTL_KEY, String(Date.now()));
            localStorage.setItem('negocioSlug', negocio.slug);
            guardarNombreNegocioPorSlug(negocio.slug, negocio.nombre);
            window.NEGOCIO_ID_POR_DEFECTO = id;
            window._negocioIdResuelto = true;
            console.log('✅ [cliente] negocio_id resuelto:', id, '—', negocio.nombre);
            window.dispatchEvent(new CustomEvent('negocio-id-ready', { detail: { id, slug: negocio.slug, nombre: negocio.nombre } }));
            return id;
        } catch (err) {
            console.error('❌ Error resolviendo negocio por slug:', err);
            return null;
        }
    })();
})();

// ============================================================
// 3. INTERFAZ GLOBAL (compatible con config-negocio.js antiguo)
// ============================================================
window.getNegocioId = function() {
    return window.NEGOCIO_ID_POR_DEFECTO || '';
};

window.getNegocioIdFromConfig = function() {
    return window.NEGOCIO_ID_POR_DEFECTO || '';
};

// ============================================================
// 4. UTILIDADES DE COLOR (idénticas al original)
// ============================================================
function hexToRgbParts(hex, fallback = '236 72 153') {
    const limpio = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return fallback;
    return `${parseInt(limpio.slice(0,2),16)} ${parseInt(limpio.slice(2,4),16)} ${parseInt(limpio.slice(4,6),16)}`;
}

function normalizarHexColor(hex, fallback = '#ec4899') {
    const limpio = String(hex || '').replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(limpio) ? `#${limpio}` : fallback;
}

function getRgbFromHex(hex) {
    const limpio = normalizarHexColor(hex).replace('#', '');
    return { r: parseInt(limpio.slice(0,2),16), g: parseInt(limpio.slice(2,4),16), b: parseInt(limpio.slice(4,6),16) };
}

function getLuminancia(hex) {
    const { r, g, b } = getRgbFromHex(hex);
    const canal = v => { const n = v/255; return n <= 0.03928 ? n/12.92 : Math.pow((n+0.055)/1.055, 2.4); };
    return 0.2126*canal(r) + 0.7152*canal(g) + 0.0722*canal(b);
}

function oscurecerHex(hex, factor = 0.55) {
    const { r, g, b } = getRgbFromHex(hex);
    const toHex = v => Math.max(0, Math.min(255, Math.round(v*factor))).toString(16).padStart(2,'0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function asegurarColorVisible(hex, fallback = '#c0266f') {
    const color = normalizarHexColor(hex, fallback);
    return getLuminancia(color) > 0.72 ? oscurecerHex(color, 0.45) : color;
}

// ============================================================
// 5. TEMA (idéntico al original)
// ============================================================
function aplicarTemaNegocio(config = {}) {
    const primarioOriginal  = normalizarHexColor(config.color_primario,   '#ec4899');
    const secundarioOriginal = normalizarHexColor(config.color_secundario, '#f9a8d4');
    const primario   = asegurarColorVisible(primarioOriginal, '#c0266f');
    const secundario = getLuminancia(secundarioOriginal) > 0.86 ? '#f9a8d4' : secundarioOriginal;
    const primarioRgb   = hexToRgbParts(primario);
    const secundarioRgb = hexToRgbParts(secundario, '249 168 212');
    const root = document.documentElement;
    root.style.setProperty('--brand-primary',           primario);
    root.style.setProperty('--brand-secondary',         secundario);
    root.style.setProperty('--brand-primary-original',  primarioOriginal);
    root.style.setProperty('--brand-secondary-original', secundarioOriginal);
    root.style.setProperty('--brand-primary-rgb',       primarioRgb);
    root.style.setProperty('--brand-secondary-rgb',     secundarioRgb);
    const secRgbCss = secundarioRgb.split(' ').join(', ');
    root.style.setProperty('--brand-soft',         `rgba(${secRgbCss}, 0.20)`);
    root.style.setProperty('--brand-surface',      `rgba(${secRgbCss}, 0.12)`);
    root.style.setProperty('--brand-surface-strong',`rgba(${secRgbCss}, 0.28)`);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', primario);
}
window.aplicarTemaNegocio = aplicarTemaNegocio;

// ============================================================
// 6. PREFERENCIAS WHATSAPP
// ============================================================
let configCache = null;
let ultimaActualizacion = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 min

function normalizarPreferenciasWhatsApp(config = {}) {
    const moneda = String(config.whatsapp_moneda || 'CUP').toUpperCase();
    return {
        moneda: ['CUP', 'USD', 'EUR', 'MXN'].includes(moneda) ? moneda : 'CUP',
        mostrarCostos: config.whatsapp_mostrar_costos !== false
    };
}

window.getPreferenciasWhatsAppNegocio = function(config = null) {
    return normalizarPreferenciasWhatsApp(config || configCache || {});
};

// ============================================================
// 7. CARGA DE CONFIGURACIÓN DEL NEGOCIO
//    Espera a que el negocio_id esté disponible si es primera visita
// ============================================================
window.cargarConfiguracionNegocio = async function(forceRefresh = false) {
    // Si el ID no está resuelto aún, esperar la promesa async
    if (!window._negocioIdResuelto && window._negocioResolvePromise) {
        console.log('⏳ Esperando resolución del negocio_id...');
        await window._negocioResolvePromise;
    }

    const negocioId = window.NEGOCIO_ID_POR_DEFECTO;
    if (!negocioId) {
        console.error('❌ No hay negocio_id disponible');
        return null;
    }

    // Caché de configuración
    if (!forceRefresh && configCache && (Date.now() - ultimaActualizacion) < CACHE_DURATION) {
        console.log('📦 Usando caché de configuración');
        aplicarTemaNegocio(configCache);
        window.actualizarManifestPWA?.(configCache);
        return configCache;
    }

    try {
        console.log('🌐 Cargando configuración del negocio desde Supabase...', negocioId);
        const url = `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}&select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('❌ Error HTTP:', response.status, await response.text());
            return null;
        }

        const data = await response.json();
        configCache = data[0] || null;
        ultimaActualizacion = Date.now();

        if (configCache) {
            const pref = normalizarPreferenciasWhatsApp(configCache);
            configCache.whatsapp_moneda = pref.moneda;
            configCache.whatsapp_mostrar_costos = pref.mostrarCostos;
            if (window.setCodigoPaisTelefono) {
                window.setCodigoPaisTelefono(configCache.codigo_pais || configCache.codigo_pais_telefono || '53');
            }
            aplicarTemaNegocio(configCache);
            if (window._rservasSlugActual) {
                localStorage.setItem('negocioSlug', window._rservasSlugActual);
                guardarNombreNegocioPorSlug(window._rservasSlugActual, configCache.nombre);
                window.actualizarManifestPWA?.(configCache);
            }
            console.log('✅ Config cargada:', configCache.nombre);
            // Actualizar localStorage del admin con el ID confirmado
            if (!localStorage.getItem('negocioId')) {
                localStorage.setItem('negocioId', negocioId);
            }
        }
        return configCache;
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        return null;
    }
};

// ============================================================
// 8. HELPERS DE DATOS (idénticos al original)
// ============================================================
window.getNombreNegocio = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.nombre || '';
};
window.getTelefonoDuenno = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.telefono || '';
};
window.getCodigoPaisNegocio = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(c) : (c?.codigo_pais || '53');
};
window.getEmailNegocio = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.email || '';
};
window.getInstagram = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.instagram || '';
};
window.getFacebook = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.facebook || '';
};
window.getHorarioAtencion = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.horario_atencion || '';
};
window.getMensajeBienvenida = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.mensaje_bienvenida || '¡Bienvenida!';
};
window.getMensajeConfirmacion = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.mensaje_confirmacion || 'Tu turno ha sido reservado con éxito';
};
window.getNtfyTopic = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.ntfy_topic || '';
};
window.getRequiereAnticipo = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.requiere_anticipo || false;
};
function construirUrlClientesNegocio(config = null) {
    const slug = (
        window._rservasSlugActual ||
        config?.slug ||
        localStorage.getItem('adminSlug') ||
        localStorage.getItem('negocioSlug') ||
        ''
    ).toLowerCase().trim();

    if (slug) return 'https://tusalon.github.io/rservasroma/?s=' + encodeURIComponent(slug);
    return config?.url_clientes || '';
}
window.construirUrlClientesNegocio = construirUrlClientesNegocio;

window.getUrlClientes = async function() {
    const c = await window.cargarConfiguracionNegocio();
    // Sin url_clientes en la BD, el enlace se arma contra la app maestra
    // (/rservasroma/?s=slug). El fallback anterior apuntaba a una carpeta
    // propia por salón (/slug/), que es una copia aparte y no recibe las
    // mejoras de la app; los salones nuevos terminaban compartiendo ese
    // formato en vez del de la app maestra.
    return construirUrlClientesNegocio(c);
};
window.negocioConfigurado = async function() {
    const c = await window.cargarConfiguracionNegocio();
    return c?.configurado || false;
};

// ============================================================
// 9. PRECARGA AUTOMÁTICA
// ============================================================
setTimeout(async () => {
    console.log('🔄 Precargando configuración automática...');
    await window.cargarConfiguracionNegocio();

    // Refrescar caché de slug en background si fue hit en caché
    if (window._negocioSlugCacheRefresh) {
        const { slug, CACHE_ID_KEY, CACHE_TTL_KEY } = window._negocioSlugCacheRefresh;
        try {
            const url = `${window.SUPABASE_URL}/rest/v1/negocios?slug=eq.${encodeURIComponent(slug)}&select=id`;
            const res = await fetch(url, {
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data[0]?.id) {
                    localStorage.setItem(CACHE_ID_KEY, data[0].id);
                    localStorage.setItem(CACHE_TTL_KEY, String(Date.now()));
                }
            }
        } catch (e) { /* silencioso */ }
    }
}, 500);


// ============================================================
// 10. MANIFEST DINÁMICO POR SALÓN (PWA)
// ============================================================
window.actualizarManifestPWA = function(config) {
    if (!config || !window._rservasSlugActual) return;

    const slug     = window._rservasSlugActual;
    const nombre   = config.nombre || 'Mi Salón';
    const shortName = nombre.split(' ').slice(0, 2).join(' ');
    const color    = config.color_primario || '#ec4899';
    const startUrl = window.location.origin + window.location.pathname + '?s=' + slug;

    const manifestData = {
        id: startUrl,
        name: nombre,
        short_name: shortName,
        description: 'Reserva tu turno en ' + nombre,
        start_url: startUrl,
        scope: window.location.origin + window.location.pathname,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: color,
        lang: 'es',
        icons: [
            { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
    };

    try {
        const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/manifest+json' });
        const url  = URL.createObjectURL(blob);
        let link   = document.querySelector('link[rel="manifest"]');
        if (!link) {
            link     = document.createElement('link');
            link.rel = 'manifest';
            document.head.appendChild(link);
        }
        const anterior = window.__rservasManifestBlobUrl;
        link.href = url;
        link.dataset.negocioSlug = slug;
        window.__rservasManifestBlobUrl = url;
        if (anterior) setTimeout(() => URL.revokeObjectURL(anterior), 1000);
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', color);
        if (nombre) {
            guardarNombreNegocioPorSlug(slug, nombre);
            document.title = nombre + ' - Reserva de Turnos';
            document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', shortName);
        }
        window.dispatchEvent(new CustomEvent('rservas-manifest-ready', { detail: { slug, nombre } }));
        console.log('📱 Manifest PWA actualizado para:', nombre);
    } catch (e) {
        console.warn('⚠️ No se pudo actualizar el manifest:', e);
    }
};

console.log('✅ config-negocio-master.js listo');
