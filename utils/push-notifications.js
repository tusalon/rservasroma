// utils/push-notifications.js - Web Push opcional para RservasRoma.

console.log('push-notifications.js cargado');

window.RSERVAS_PUSH_PUBLIC_KEY = window.RSERVAS_PUSH_PUBLIC_KEY || 'CONFIGURAR_VAPID_PUBLIC_KEY';
window.RSERVAS_PUSH_FUNCTION = window.RSERVAS_PUSH_FUNCTION || 'enviar-web-push';

function pushKeyConfigurada() {
    return Boolean(
        window.RSERVAS_PUSH_PUBLIC_KEY &&
        window.RSERVAS_PUSH_PUBLIC_KEY !== 'CONFIGURAR_VAPID_PUBLIC_KEY'
    );
}

function getNegocioIdPush() {
    if (typeof window.getNegocioIdFromConfig === 'function') return window.getNegocioIdFromConfig();
    return localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO || '';
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

function getRolPush(defaultRole = 'cliente') {
    if (localStorage.getItem('adminAuth')) return 'admin';
    if (localStorage.getItem('profesionalAuth')) return 'profesional';
    return defaultRole;
}

function pedirPermisoNotificacionesPush() {
    if (!('Notification' in window)) return Promise.resolve('unsupported');
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Promise.resolve(Notification.permission);
    }

    // Chrome moderno devuelve Promise; navegadores viejos usan callback.
    if (Notification.requestPermission.length === 0) {
        return Notification.requestPermission();
    }

    return new Promise((resolve) => {
        Notification.requestPermission(resolve);
    });
}

function getDiagnosticoPushRservas() {
    const hasNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;

    return {
        url: window.location.href,
        protocol: window.location.protocol,
        secureContext: Boolean(window.isSecureContext),
        notificationApi: hasNotification,
        notificationPermission: hasNotification ? Notification.permission : 'no disponible',
        pushManager: 'PushManager' in window,
        serviceWorker: hasServiceWorker,
        serviceWorkerController: hasServiceWorker ? Boolean(navigator.serviceWorker.controller) : false,
        vapidConfigured: pushKeyConfigurada(),
        standalone: Boolean(
            window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ) || Boolean(window.navigator.standalone),
        userAgent: navigator.userAgent || ''
    };
}

function formatearDiagnosticoPush(diagnostico, error = null) {
    const lineas = [
        'Diagnostico de notificaciones:',
        `Permiso: ${diagnostico.notificationPermission}`,
        `Contexto seguro: ${diagnostico.secureContext ? 'si' : 'no'}`,
        `Notification API: ${diagnostico.notificationApi ? 'si' : 'no'}`,
        `PushManager: ${diagnostico.pushManager ? 'si' : 'no'}`,
        `Service Worker: ${diagnostico.serviceWorker ? 'si' : 'no'}`,
        `Service Worker activo: ${diagnostico.serviceWorkerController ? 'si' : 'no'}`,
        `Llave VAPID: ${diagnostico.vapidConfigured ? 'configurada' : 'sin configurar'}`,
        `Modo app instalada: ${diagnostico.standalone ? 'si' : 'no'}`
    ];

    if (error) {
        lineas.push(`Error: ${error.message || error}`);
    }

    if (diagnostico.notificationPermission === 'denied') {
        lineas.push('');
        lineas.push('Chrome tiene bloqueado el permiso. En Android revisa:');
        lineas.push('1. Ajustes del telefono > Apps > Chrome > Notificaciones.');
        lineas.push('2. Chrome > Configuracion > Configuracion de sitios > Notificaciones.');
        lineas.push('3. Si no aparece tusalon.github.io, activa que los sitios puedan pedir permiso y vuelve a tocar el boton.');
    } else if (diagnostico.notificationPermission === 'default') {
        lineas.push('');
        lineas.push('El permiso quedo sin aceptar. Vuelve a tocar el boton y acepta el aviso del navegador.');
    }

    return lineas.join('\n');
}

window.diagnosticarPushRservasRoma = function(error = null, mostrarAlerta = true) {
    const diagnostico = getDiagnosticoPushRservas();
    console.table(diagnostico);

    if (mostrarAlerta) {
        alert(formatearDiagnosticoPush(diagnostico, error));
    }

    return diagnostico;
};

async function getRegistroServiceWorkerPush() {
    if (!('serviceWorker' in navigator)) return null;

    const ready = await navigator.serviceWorker.ready;
    return ready || null;
}

async function guardarSuscripcionPush(subscription, role, clienteWhatsapp) {
    const negocioId = getNegocioIdPush();
    console.log('[Push] guardarSuscripcionPush - negocioId:', negocioId, 'role:', role, 'cliente:', clienteWhatsapp || 'sin whatsapp');
    if (!negocioId) throw new Error('No hay negocio_id para guardar la suscripcion push.');

    const payload = {
        negocio_id: negocioId,
        role,
        endpoint: subscription.endpoint,
        subscription,
        user_agent: navigator.userAgent || '',
        activo: true,
        updated_at: new Date().toISOString()
    };

    if (clienteWhatsapp) payload.cliente_whatsapp = clienteWhatsapp;

    console.log('[Push] endpoint:', subscription.endpoint?.substring(0, 60));
    console.log('[Push] SUPABASE_URL:', window.SUPABASE_URL);

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones`, {
        method: 'POST',
        headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
    });

    console.log('[Push] respuesta HTTP:', response.status);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push] error guardando:', errorText);
        throw new Error(`No se pudo guardar la suscripcion push: ${errorText}`);
    }

    console.log('[Push] suscripcion guardada OK');
    localStorage.setItem('rservasPushActivo', 'true');
    localStorage.setItem('rservasPushRole', role);
    return true;
}

window.pushRservasDisponible = function() {
    return Boolean(
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        pushKeyConfigurada()
    );
};

window.solicitarPushRservasRoma = async function(options = {}) {
    const role = options.role || options.rol || getRolPush(options.defaultRole || 'cliente');

    if (!pushKeyConfigurada()) {
        console.warn('Push: falta clave VAPID pública');
        return { ok: false, error: 'vapid_key_missing' };
    }

    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push: navegador no compatible');
        return { ok: false, error: 'not_supported' };
    }

    const permission = options.permission || await pedirPermisoNotificacionesPush();
    if (permission !== 'granted') {
        console.warn('Push: permiso no concedido:', permission);
        return { ok: false, error: 'permission_' + permission };
    }

    const registration = await getRegistroServiceWorkerPush();
    if (!registration) {
        console.warn('Push: Service Worker no disponible');
        return { ok: false, error: 'sw_not_ready' };
    }

    try {
        console.log('[Push] VAPID key:', window.RSERVAS_PUSH_PUBLIC_KEY?.substring(0, 20));
        let subscription = await registration.pushManager.getSubscription();
        console.log('[Push] suscripcion existente:', subscription ? 'SI' : 'NO');
        if (!subscription) {
            console.log('[Push] creando nueva suscripcion...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.RSERVAS_PUSH_PUBLIC_KEY)
            });
            console.log('[Push] suscripcion creada:', subscription.endpoint?.substring(0, 60));
        }
        await guardarSuscripcionPush(subscription.toJSON ? subscription.toJSON() : subscription, role, options.clienteWhatsapp);
        return { ok: true };
    } catch (err) {
        console.error('[Push] error:', err.name, err.message);
        return { ok: false, error: err.message };
    }
};

// Envía push a una clienta específica por su whatsapp en este negocio
window.enviarPushCliente = async function({ whatsapp, title, body, url = '' } = {}) {
    try {
        if (!whatsapp || !title) return false;
        const negocioId = getNegocioIdPush();
        if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;

        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/${window.RSERVAS_PUSH_FUNCTION}`, {
            method: 'POST',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ negocio_id: negocioId, cliente_whatsapp: whatsapp, title, body, url })
        });

        const result = await response.json().catch(() => ({}));
        if (result?.sent > 0) console.log(`[Push cliente] Enviado a ${whatsapp}`);
        return result?.sent > 0;
    } catch (err) {
        console.warn('[Push cliente] Error:', err.message);
        return false;
    }
};

window.enviarWebPushRservasRoma = async function({ title, body, url = '', role = 'admin', tags = 'bell', data = {} } = {}) {
    try {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;

        const negocioId = getNegocioIdPush();
        if (!negocioId) return false;

        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/${window.RSERVAS_PUSH_FUNCTION}`, {
            method: 'POST',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                negocio_id: negocioId,
                role,
                title,
                body,
                url,
                tags,
                data
            })
        });

        if (!response.ok) {
            console.warn('Web Push no enviado:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Web Push opcional fallo:', error);
        return false;
    }
};

// ─── Alias para compatibilidad con admin-app.js ───────────────────────────────
// admin-app.js llama window.enviarNotificacionPush; la función real es enviarWebPushRservasRoma
window.enviarNotificacionPush = function(title, body, tags, role) {
    return window.enviarWebPushRservasRoma({ title, body, tags: tags || 'bell', role: role || 'admin' });
};

// ─── Detección de contexto para mostrar la card correcta ─────────────────────
function getPushContext() {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
    const permiso = 'Notification' in window ? Notification.permission : 'unsupported';
    const suscritoWeb = localStorage.getItem('rservasPushActivo') === 'true';
    const suscritoNativo = localStorage.getItem('rservasNativePushActivo') === 'true';
    return { isIOS, isStandalone, isNative, permiso, suscritoWeb, suscritoNativo };
}

function mostrarToastPush(mensaje, tipo = 'ok') {
    const existing = document.getElementById('rservas-push-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'rservas-push-toast';
    const color = tipo === 'ok' ? '#16a34a' : tipo === 'error' ? '#dc2626' : '#0f766e';
    toast.style.cssText = [
        'position:fixed', 'top:20px', 'left:50%',
        'transform:translateX(-50%)',
        `background:${color}`, 'color:#fff',
        'padding:12px 20px', 'border-radius:12px',
        'font-size:14px', 'font-weight:600',
        'z-index:99999', 'box-shadow:0 8px 24px rgba(0,0,0,.35)',
        'font-family:system-ui,sans-serif',
        'transition:opacity 0.4s ease',
        'max-width:90vw', 'text-align:center'
    ].join(';');
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3500);
}

function instalarCardPushAdmin() {
    if (document.getElementById('rservas-push-card')) return;
    if (!pushKeyConfigurada()) return;
    if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;
    if (localStorage.getItem('rservasPushCardDismissed') === 'true') return;

    const ctx = getPushContext();

    // Ya suscrito correctamente → no mostrar nada
    if (ctx.isNative && ctx.suscritoNativo) return;
    if (!ctx.isNative && ctx.suscritoWeb && ctx.permiso === 'granted') return;

    // iOS sin standalone → mostrar instrucciones de "Añadir a inicio"
    if (ctx.isIOS && !ctx.isStandalone) {
        _mostrarCardIOSInstrucciones();
        return;
    }

    // Push bloqueado por el usuario → mostrar mensaje de ayuda
    if (ctx.permiso === 'denied') {
        _mostrarCardBloqueado();
        return;
    }

    // Caso normal: pedir permiso
    _mostrarCardPermisoNormal();
}

function _crearCardBase() {
    const card = document.createElement('div');
    card.id = 'rservas-push-card';
    card.style.cssText = [
        'position:fixed', 'bottom:24px', 'left:50%',
        'transform:translateX(-50%) translateY(120px)',
        'background:#1C1C1E',
        'border:1px solid rgba(255,255,255,0.10)',
        'border-radius:20px',
        'padding:18px 20px',
        'width:calc(100% - 40px)', 'max-width:400px',
        'z-index:9998',
        'box-shadow:0 20px 60px rgba(0,0,0,.55)',
        'font-family:system-ui,-apple-system,sans-serif',
        'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'display:flex', 'align-items:flex-start', 'gap:14px'
    ].join(';');
    document.body.appendChild(card);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { card.style.transform = 'translateX(-50%) translateY(0)'; });
    });
    return card;
}

function _botonCerrarCard(card) {
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.style.cssText = [
        'position:absolute', 'top:12px', 'right:14px',
        'background:none', 'border:none', 'color:#6b7280',
        'font-size:16px', 'cursor:pointer', 'padding:4px', 'line-height:1'
    ].join(';');
    btn.onclick = () => {
        card.style.transform = 'translateX(-50%) translateY(120px)';
        setTimeout(() => card.remove(), 400);
        localStorage.setItem('rservasPushCardDismissed', 'true');
    };
    card.style.position = 'fixed';
    card.appendChild(btn);
    return btn;
}

function _mostrarCardPermisoNormal() {
    const card = _crearCardBase();
    _botonCerrarCard(card);

    card.innerHTML += `
        <div style="font-size:28px;flex-shrink:0;line-height:1">🔔</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Activa las notificaciones
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.4;margin-bottom:14px">
                Recibe avisos de nuevas reservas, cancelaciones y pagos al instante.
            </div>
            <button id="rservas-push-activar" style="
                background:#FF1493;color:#fff;border:none;border-radius:10px;
                padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;
                width:100%;font-family:inherit
            ">Activar notificaciones</button>
        </div>
    `;

    document.getElementById('rservas-push-activar').addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = 'Activando...';
        const permission = await pedirPermisoNotificacionesPush();
        const result = await window.solicitarPushRservasRoma({ defaultRole: getRolPush(), permission });
        if (result?.ok) {
            card.style.transform = 'translateX(-50%) translateY(120px)';
            setTimeout(() => card.remove(), 400);
            mostrarToastPush('✅ Notificaciones activadas');
        } else if (Notification.permission === 'denied') {
            card.remove();
            _mostrarCardBloqueado();
        } else {
            this.disabled = false;
            this.textContent = 'Activar notificaciones';
            mostrarToastPush('No se pudo activar. Intenta de nuevo.', 'error');
        }
    });
}

function _mostrarCardBloqueado() {
    const card = _crearCardBase();
    _botonCerrarCard(card);
    card.innerHTML += `
        <div style="font-size:28px;flex-shrink:0;line-height:1">🚫</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Notificaciones bloqueadas
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                Actívalas manualmente:<br>
                <strong style="color:#d1d5db">Chrome → ⋮ → Configuración → Notificaciones del sitio</strong>
            </div>
        </div>
    `;
}

function _mostrarCardIOSInstrucciones() {
    const card = _crearCardBase();
    _botonCerrarCard(card);
    card.innerHTML += `
        <div style="font-size:28px;flex-shrink:0;line-height:1">📲</div>
        <div style="flex:1;min-width:0">
            <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:4px">
                Instala la app para recibir notificaciones
            </div>
            <div style="color:#9ca3af;font-size:13px;line-height:1.5">
                En iPhone, toca <strong style="color:#d1d5db">Compartir</strong> →
                <strong style="color:#d1d5db">Agregar a pantalla de inicio</strong>.
                Luego abre la app desde ahí y activa las notificaciones.
            </div>
        </div>
    `;
}

window.addEventListener('load', () => {
    setTimeout(instalarCardPushAdmin, 2000);
});
