// utils/panel-sesion.js — sesion verificada en el servidor para las partes privadas del panel (fichas de clientas).
//
// El panel trabaja con la clave publica; para los datos de salud hace falta que el servidor sepa quien es.
// La funcion panel-login (supabase/functions/panel-login) comprueba la contrasena y devuelve un token de
// 12 horas. Aqui se guarda, se revisa que no haya caducado y, si hace falta, se pide la contrasena otra vez.
//
// El token vive en sessionStorage (se borra al cerrar la pestana o la app), no en localStorage. Pedir la
// contrasena al abrir una ficha tambien es a proposito: son datos de salud y el panel puede estar abierto en
// un telefono que otra persona toma prestado.
//
// leerSesion es pura y tiene prueba (tests/panel-sesion.test.js).

(function (raiz) {
    'use strict';

    const CLAVE = 'panelSesionToken';
    const MARGEN_S = 60;   // se renueva un minuto antes de que caduque

    // almacen: { getItem }. Devuelve { token, expira_en, rol, nivel } o null si falta o caduco.
    function leerSesion(almacen, ahoraMs) {
        let sesion = null;
        try { sesion = JSON.parse(almacen.getItem(CLAVE) || 'null'); } catch (e) { return null; }
        if (!sesion || typeof sesion.token !== 'string' || !sesion.token) return null;
        if (!(Number(sesion.expira_en) - MARGEN_S > Math.floor(ahoraMs / 1000))) return null;
        return sesion;
    }

    const api = { leerSesion, CLAVE };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    const tr = (txt) => (typeof window.t === 'function' ? window.t(txt) : txt);

    function slugActual() {
        return String(window._rservasSlugActual || localStorage.getItem('adminSlug') || localStorage.getItem('negocioSlug') || '').toLowerCase().trim();
    }

    function telefonoProfesional() {
        try {
            const auth = JSON.parse(localStorage.getItem('profesionalAuth') || 'null');
            return auth && auth.telefono ? String(auth.telefono).replace(/\D/g, '') : '';
        } catch (e) { return ''; }
    }

    function token() {
        const sesion = leerSesion(window.sessionStorage, Date.now());
        return sesion ? sesion.token : null;
    }

    function limpiar() {
        try { window.sessionStorage.removeItem(CLAVE); } catch (e) {}
    }

    function cabeceras(tokenPanel) {
        return {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${tokenPanel}`,
            'Content-Type': 'application/json'
        };
    }

    // Comprueba la contrasena en el servidor y guarda el token. Lanza Error con un mensaje para mostrar.
    async function iniciar(password) {
        const slug = slugActual();
        if (!slug) throw new Error(tr('No se pudo saber de qué salón eres. Vuelve a entrar al panel.'));
        const cuerpo = { slug, password };
        const telefono = telefonoProfesional();
        if (telefono) cuerpo.telefono = telefono;

        let respuesta;
        try {
            respuesta = await fetch(`${window.SUPABASE_URL}/functions/v1/panel-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` },
                body: JSON.stringify(cuerpo)
            });
        } catch (e) {
            throw new Error(tr('Sin conexión. Revisa tu internet e inténtalo de nuevo.'));
        }
        const datos = await respuesta.json().catch(() => ({}));
        if (respuesta.status === 404 || respuesta.status === 503) {
            throw new Error(tr('Las fichas todavía no están activadas en el servidor. Avisa a soporte.'));
        }
        if (!respuesta.ok || !datos.token) throw new Error(datos.error || tr('No se pudo iniciar la sesión.'));
        if (Number(datos.nivel) < 3) throw new Error(tr('Tu nivel de acceso no permite ver las fichas.'));
        try { window.sessionStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) {}
        return datos.token;
    }

    // Pequeno cuadro para escribir la contrasena. Resuelve con el token, o null si cancela.
    function pedirClave() {
        return new Promise((resolve) => {
            const previo = document.getElementById('panel-clave-overlay');
            if (previo) previo.remove();
            const fondo = document.createElement('div');
            fondo.id = 'panel-clave-overlay';
            fondo.setAttribute('role', 'dialog');
            fondo.setAttribute('aria-modal', 'true');
            fondo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;font-family:system-ui,-apple-system,sans-serif';
            fondo.innerHTML = `
                <form style="background:#fff;border-radius:20px;max-width:360px;width:100%;padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
                    <div style="font-size:34px;text-align:center" aria-hidden="true">🔒</div>
                    <h2 style="margin:6px 0 6px;font-size:18px;font-weight:800;color:#111;text-align:center">${tr('Escribe tu contraseña')}</h2>
                    <p style="margin:0 0 14px;font-size:13px;color:#555;line-height:1.45;text-align:center">${tr('Las fichas tienen datos de salud. Confirma que eres tú: es la misma contraseña con la que entras al panel.')}</p>
                    <input id="panel-clave-input" type="password" autocomplete="current-password" style="width:100%;min-height:44px;border:1px solid #ccc;border-radius:10px;padding:0 12px;font-size:16px;box-sizing:border-box">
                    <p id="panel-clave-error" role="alert" style="display:none;margin:8px 0 0;font-size:13px;color:#b91c1c"></p>
                    <button type="submit" id="panel-clave-ok" style="width:100%;margin-top:14px;background:#FF1493;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;min-height:44px">${tr('Entrar')}</button>
                    <button type="button" id="panel-clave-cancelar" style="width:100%;background:none;border:none;color:#666;font-size:14px;padding:12px 0 0;cursor:pointer;min-height:44px">${tr('Cancelar')}</button>
                </form>`;
            document.body.appendChild(fondo);
            const entrada = fondo.querySelector('#panel-clave-input');
            const error = fondo.querySelector('#panel-clave-error');
            const boton = fondo.querySelector('#panel-clave-ok');
            const cerrar = (valor) => { fondo.remove(); resolve(valor); };
            fondo.querySelector('#panel-clave-cancelar').onclick = () => cerrar(null);
            fondo.querySelector('form').onsubmit = async (evento) => {
                evento.preventDefault();
                if (!entrada.value) return;
                boton.disabled = true;
                error.style.display = 'none';
                try {
                    cerrar(await iniciar(entrada.value));
                } catch (e) {
                    error.textContent = e.message;
                    error.style.display = 'block';
                    boton.disabled = false;
                    entrada.select();
                }
            };
            entrada.focus();
        });
    }

    // Token vigente, o pide la contrasena. null si la persona cancela.
    async function asegurar() {
        return token() || pedirClave();
    }

    window.panelSesion = Object.assign(api, { token, limpiar, cabeceras, iniciar, pedirClave, asegurar });

    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        'Escribe tu contraseña': 'Enter your password',
        'Las fichas tienen datos de salud. Confirma que eres tú: es la misma contraseña con la que entras al panel.': 'Records contain health data. Confirm it is you: it is the same password you use to enter the panel.',
        'Entrar': 'Enter',
        'Cancelar': 'Cancel',
        'No se pudo saber de qué salón eres. Vuelve a entrar al panel.': 'Could not tell which salon you belong to. Sign in to the panel again.',
        'Sin conexión. Revisa tu internet e inténtalo de nuevo.': 'No connection. Check your internet and try again.',
        'Las fichas todavía no están activadas en el servidor. Avisa a soporte.': 'Records are not yet enabled on the server. Contact support.',
        'No se pudo iniciar la sesión.': 'Could not sign in.',
        'Tu nivel de acceso no permite ver las fichas.': 'Your access level does not allow viewing records.'
    });
})(typeof window !== 'undefined' ? window : globalThis);
