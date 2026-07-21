// utils/native-push-notifications.js - Push nativo para APK Capacitor.

console.log('native-push-notifications.js cargado');

function isRservasNativeApp() {
    return Boolean(
        window.Capacitor &&
        (
            window.Capacitor.isNativePlatform?.() ||
            window.Capacitor.getPlatform?.() === 'android' ||
            window.Capacitor.getPlatform?.() === 'ios'
        )
    );
}

function getNativePushPlugin() {
    return window.Capacitor?.Plugins?.PushNotifications || null;
}

function getNegocioIdNativePush() {
    if (typeof window.getNegocioIdFromConfig === 'function') return window.getNegocioIdFromConfig();
    return localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO || '';
}

function getRolNativePush(defaultRole = 'admin') {
    if (localStorage.getItem('adminAuth')) return 'admin';
    if (localStorage.getItem('profesionalAuth')) return 'profesional';
    return defaultRole;
}

function getProfesionalIdNativePush() {
    try {
        if (localStorage.getItem('adminAuth')) return null;
        const profesional = typeof window.getProfesionalAutenticado === 'function'
            ? window.getProfesionalAutenticado()
            : null;
        return profesional?.id || null;
    } catch (e) {
        return null;
    }
}

function getNativePushContextKey(role = getRolNativePush('admin'), profesionalId = getProfesionalIdNativePush()) {
    const negocioId = getNegocioIdNativePush();
    if (!negocioId || !role) return '';
    const sujeto = role === 'profesional' ? String(profesionalId || '') : 'all';
    return `${negocioId}:${role}:${sujeto}`;
}

function nativePushActivoParaContexto() {
    const role = getRolNativePush('admin');
    const profesionalId = getProfesionalIdNativePush();
    const contexto = getNativePushContextKey(role, profesionalId);
    return Boolean(
        contexto &&
        localStorage.getItem('rservasNativePushActivo') === 'true' &&
        localStorage.getItem('rservasNativePushToken') &&
        localStorage.getItem('rservasNativePushRole') === role &&
        localStorage.getItem('rservasNativePushContext') === contexto
    );
}

window.nativePushActivoParaContexto = nativePushActivoParaContexto;

function marcarNativePushActivo(token, role, profesionalId, clienteWhatsapp, negocioId) {
    localStorage.setItem('rservasNativePushActivo', 'true');
    localStorage.setItem('rservasNativePushRole', role);
    localStorage.setItem('rservasNativePushToken', token);
    localStorage.setItem('rservasNativePushContext', getNativePushContextKey(role, profesionalId));
    if (role === 'profesional' && profesionalId) {
        localStorage.setItem('rservasNativePushProfesionalId', String(profesionalId));
    } else {
        localStorage.removeItem('rservasNativePushProfesionalId');
    }
    if (role === 'cliente' && clienteWhatsapp && negocioId && typeof window.marcarClientePushActivoLocal === 'function') {
        window.marcarClientePushActivoLocal(negocioId, clienteWhatsapp);
    }
    window.dispatchEvent(new CustomEvent('rservas-push-status-changed'));
}

function esDuplicadoEndpointPush(errorText) {
    return /23505|duplicate key|push_suscripciones_endpoint_key/i.test(errorText || '');
}

async function desactivarOtrosPerfilesStaff(endpoint, role) {
    if (role === 'cliente') return;
    const endpointEncoded = encodeURIComponent(endpoint);
    const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/push_suscripciones?endpoint=eq.${endpointEncoded}&role=neq.cliente`,
        {
            method: 'PATCH',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ activo: false, updated_at: new Date().toISOString() })
        }
    );
    if (!response.ok) {
        console.warn('No se pudieron desactivar perfiles push staff anteriores:', await response.text());
    }
}

async function guardarTokenNativePush(token, role, profesionalId, clienteWhatsapp) {
    const negocioId = getNegocioIdNativePush();
    if (!negocioId) throw new Error('No hay negocio_id para guardar el token nativo.');

    const platform = window.Capacitor?.getPlatform?.() || 'native';
    const payload = {
        negocio_id: negocioId,
        role,
        endpoint: `native:${platform}:${token}`,
        subscription: {
            provider: 'fcm',
            token,
            platform
        },
        user_agent: navigator.userAgent || platform,
        activo: true,
        updated_at: new Date().toISOString()
    };
    if (role === 'cliente' && clienteWhatsapp) payload.cliente_whatsapp = clienteWhatsapp;
    if (role === 'profesional' && profesionalId) payload.profesional_id = profesionalId;
    if (role === 'admin') payload.profesional_id = null;

    await desactivarOtrosPerfilesStaff(payload.endpoint, role);

    const upsertUrl = `${window.SUPABASE_URL}/rest/v1/push_suscripciones?on_conflict=endpoint,negocio_id,role`;
    const legacyUpsertUrl = `${window.SUPABASE_URL}/rest/v1/push_suscripciones?on_conflict=endpoint`;

    let response = await fetch(upsertUrl, {
        method: 'POST',
        headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const firstError = await response.clone().text();
        if (/42P10|no unique or exclusion constraint/i.test(firstError)) {
            console.warn('Falta aplicar el SQL multinegocio; usando compatibilidad temporal.');
            response = await fetch(legacyUpsertUrl, {
                method: 'POST',
                headers: {
                    apikey: window.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(payload)
            });
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        if (esDuplicadoEndpointPush(errorText)) {
            console.warn('El token nativo ya existia; actualizando registro por endpoint.');
            const endpointEncoded = encodeURIComponent(payload.endpoint);
            const updatePayload = { ...payload };
            delete updatePayload.endpoint;
            response = await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones?endpoint=eq.${endpointEncoded}`, {
                method: 'PATCH',
                headers: {
                    apikey: window.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal'
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) {
                console.warn('No se pudo actualizar el token duplicado; se marca activo porque el endpoint ya existe.', await response.text());
            }

            marcarNativePushActivo(token, role, profesionalId, clienteWhatsapp, negocioId);
            return true;
        }

        if (payload.profesional_id !== undefined && /profesional_id/i.test(errorText)) {
            console.warn('La columna profesional_id aun no existe; guardando token nativo sin filtro profesional.');
            delete payload.profesional_id;
            response = await fetch(upsertUrl, {
                method: 'POST',
                headers: {
                    apikey: window.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                marcarNativePushActivo(token, role, profesionalId, clienteWhatsapp, negocioId);
                return true;
            }
        }
        throw new Error(`No se pudo guardar el token nativo: ${errorText}`);
    }

    marcarNativePushActivo(token, role, profesionalId, clienteWhatsapp, negocioId);
    return true;
}

function mostrarToastNativo(mensaje, tipo = 'ok') {
    if (window.mostrarToastPush) { window.mostrarToastPush(mensaje, tipo); return; }
    const color = tipo === 'ok' ? '#16a34a' : tipo === 'error' ? '#dc2626' : '#0f766e';
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${color};color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:system-ui,sans-serif;max-width:90vw;text-align:center;white-space:pre-line;transition:opacity 0.4s`;
    t.textContent = mensaje;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
}

function mostrarPushNativoEnPrimerPlano(notification) {
    const title = notification?.title || notification?.data?.title || 'Rservasroma';
    const body = notification?.body || notification?.data?.body || 'Tienes una nueva notificacion';
    mostrarToastNativo(`${title}\n${body}`, 'info');
    try { navigator.vibrate?.([180, 90, 180]); } catch (error) {}
    window.dispatchEvent(new CustomEvent('rservas-native-push-received', { detail: notification || {} }));
}

function abrirDestinoPushNativo(action) {
    const notification = action?.notification || action || {};
    const rawUrl = notification?.data?.url || '';
    if (!rawUrl) return;
    try {
        const destino = new URL(rawUrl, window.location.href);
        if (/\/admin(?:\.html)?\/?$/i.test(destino.pathname)) {
            window.location.href = `admin.html${destino.search || ''}${destino.hash || ''}`;
            return;
        }
        if (destino.origin === window.location.origin || destino.hostname === 'tusalon.github.io') {
            window.location.href = destino.href;
        }
    } catch (error) {
        console.warn('URL de push invalida:', rawUrl);
    }
}

async function configurarListenersNativePush(PushNotifications, onRegistration, onRegistrationError) {
    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener('pushNotificationReceived', mostrarPushNativoEnPrimerPlano);
    await PushNotifications.addListener('pushNotificationActionPerformed', abrirDestinoPushNativo);
    if (onRegistration) await PushNotifications.addListener('registration', onRegistration);
    if (onRegistrationError) await PushNotifications.addListener('registrationError', onRegistrationError);
}

async function crearCanalNativePush(PushNotifications) {
    try {
        await PushNotifications.createChannel({
            id: 'default',
            name: 'Rservasroma',
            description: 'Reservas, cancelaciones, pagos y resumenes de agenda',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#EC4899'
        });
    } catch (error) {
        console.warn('No se pudo crear el canal de notificaciones:', error?.message || error);
    }
}

async function instalarRecepcionNativePush() {
    const PushNotifications = getNativePushPlugin();
    if (!isRservasNativeApp() || !PushNotifications) return;
    try {
        await configurarListenersNativePush(PushNotifications);
        await crearCanalNativePush(PushNotifications);
    } catch (error) {
        console.warn('No se pudieron instalar los listeners push nativos:', error?.message || error);
    }
}

window.solicitarNativePushRservasRoma = async function(options = {}) {
    const role = options.role || getRolNativePush(options.defaultRole || 'admin');
    const profesionalId = options.profesionalId || options.profesional_id || getProfesionalIdNativePush();
    const clienteWhatsapp = options.clienteWhatsapp || options.cliente_whatsapp || window.getClienteWhatsappPushActual?.() || null;
    const PushNotifications = getNativePushPlugin();

    if (!isRservasNativeApp()) return false;

    if (!PushNotifications) {
        mostrarToastNativo('Esta APK aún no tiene push nativo. Descarga la versión actualizada.', 'error');
        return false;
    }

    return new Promise(async (resolve) => {
        let finished = false;
        const finish = (ok) => { if (finished) return; finished = true; resolve(ok); };

        try {
            const permission = await PushNotifications.requestPermissions();
            if (permission.receive !== 'granted') {
                mostrarToastNativo('Permiso de notificaciones denegado por Android.', 'error');
                finish(false);
                return;
            }

            await crearCanalNativePush(PushNotifications);
            await configurarListenersNativePush(PushNotifications, async (token) => {
                try {
                    await guardarTokenNativePush(token.value, role, profesionalId, clienteWhatsapp);
                    mostrarToastNativo('✅ Notificaciones activadas');
                    finish(true);
                } catch (error) {
                    console.error('No se pudo guardar token nativo:', error);
                    mostrarToastNativo(error.message || 'No se pudo guardar el token.', 'error');
                    finish(false);
                }
            }, (error) => {
                console.error('Error registrando push nativo:', error);
                mostrarToastNativo('Firebase no configurado en esta APK. Descarga la versión actualizada.', 'error');
                finish(false);
            });

            await PushNotifications.register();

            setTimeout(() => {
                if (!finished) {
                    mostrarToastNativo('No se recibió token. Verifica que Firebase esté configurado.', 'error');
                    finish(false);
                }
            }, 12000);
        } catch (error) {
            console.error('Error solicitando push nativo:', error);
            mostrarToastNativo(error.message || 'No se pudo activar las notificaciones.', 'error');
            finish(false);
        }
    });
};

async function refrescarTokenNativePushActual() {
    try {
        if (!isRservasNativeApp()) return;
        if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;
        const token = localStorage.getItem('rservasNativePushToken');
        if (!token) return;
        const role = getRolNativePush('admin');
        const profesionalId = getProfesionalIdNativePush();
        await guardarTokenNativePush(token, role, profesionalId);
    } catch (error) {
        console.warn('No se pudo refrescar el token nativo:', error.message);
    }
}

// La card de push nativo se muestra desde push-notifications.js (instalarCardPushAdmin)
// porque detecta isNative y delega a solicitarNativePushRservasRoma.
// Este botón solo se instala como fallback si la card web no está disponible.
function instalarBotonNativePushAdmin() {
    if (!isRservasNativeApp()) return;
    if (document.getElementById('rservas-native-push-button')) return;
    if (document.getElementById('rservas-push-card')) return; // la card web ya está
    if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;
    if (nativePushActivoParaContexto()) return;

    const button = document.createElement('button');
    button.id = 'rservas-native-push-button';
    button.type = 'button';
    button.textContent = '🔔 Activar notificaciones';
    button.style.cssText = [
        'position:fixed',
        'bottom:24px', 'left:50%',
        'transform:translateX(-50%)',
        'z-index:9998',
        'border:0',
        'border-radius:14px',
        'padding:14px 24px',
        'background:#FF1493',
        'color:#fff',
        'font-weight:700',
        'font-size:14px',
        'box-shadow:0 10px 30px rgba(255,20,147,.35)',
        'cursor:pointer',
        'font-family:system-ui,sans-serif',
        'white-space:nowrap'
    ].join(';');

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Activando...';
        const ok = await window.solicitarNativePushRservasRoma({ defaultRole: 'admin' }).catch((error) => {
            console.error('Error activando push APK:', error);
            mostrarToastNativo(error.message || 'No se pudo activar.', 'error');
            return false;
        });
        if (ok) { button.remove(); return; }
        button.disabled = false;
        button.textContent = '🔔 Activar notificaciones';
    });

    document.body.appendChild(button);
}

if (window.RSERVAS_PUSH_UI_VISIBLE === true) {
    window.addEventListener('load', () => {
        setTimeout(instalarRecepcionNativePush, 300);
        setTimeout(refrescarTokenNativePushActual, 1400);
        setTimeout(instalarBotonNativePushAdmin, 1800);
    });
}
