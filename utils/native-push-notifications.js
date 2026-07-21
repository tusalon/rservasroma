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

async function guardarTokenNativePush(token, role, profesionalId) {
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
    if (role === 'profesional' && profesionalId) payload.profesional_id = profesionalId;
    if (role === 'admin') payload.profesional_id = null;

    let response = await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones`, {
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
        const errorText = await response.text();
        if (payload.profesional_id !== undefined && /profesional_id/i.test(errorText)) {
            console.warn('La columna profesional_id aun no existe; guardando token nativo sin filtro profesional.');
            delete payload.profesional_id;
            response = await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones`, {
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
                localStorage.setItem('rservasNativePushActivo', 'true');
                localStorage.setItem('rservasNativePushRole', role);
                localStorage.setItem('rservasNativePushToken', token);
                return true;
            }
        }
        throw new Error(`No se pudo guardar el token nativo: ${errorText}`);
    }

    localStorage.setItem('rservasNativePushActivo', 'true');
    localStorage.setItem('rservasNativePushRole', role);
    localStorage.setItem('rservasNativePushToken', token);
    if (role === 'profesional' && profesionalId) {
        localStorage.setItem('rservasNativePushProfesionalId', String(profesionalId));
    } else {
        localStorage.removeItem('rservasNativePushProfesionalId');
    }
    return true;
}

function mostrarToastNativo(mensaje, tipo = 'ok') {
    if (window.mostrarToastPush) { window.mostrarToastPush(mensaje, tipo); return; }
    const color = tipo === 'ok' ? '#16a34a' : tipo === 'error' ? '#dc2626' : '#0f766e';
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${color};color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:system-ui,sans-serif;max-width:90vw;text-align:center;transition:opacity 0.4s`;
    t.textContent = mensaje;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
}

window.solicitarNativePushRservasRoma = async function(options = {}) {
    const role = options.role || getRolNativePush(options.defaultRole || 'admin');
    const profesionalId = options.profesionalId || options.profesional_id || getProfesionalIdNativePush();
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

            await PushNotifications.removeAllListeners();

            await PushNotifications.addListener('registration', async (token) => {
                try {
                    await guardarTokenNativePush(token.value, role, profesionalId);
                    mostrarToastNativo('✅ Notificaciones activadas');
                    finish(true);
                } catch (error) {
                    console.error('No se pudo guardar token nativo:', error);
                    mostrarToastNativo(error.message || 'No se pudo guardar el token.', 'error');
                    finish(false);
                }
            });

            await PushNotifications.addListener('registrationError', (error) => {
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
    if (localStorage.getItem('rservasNativePushActivo') === 'true') return;

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
        setTimeout(refrescarTokenNativePushActual, 1400);
        setTimeout(instalarBotonNativePushAdmin, 1800);
    });
}
