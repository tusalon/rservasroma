// utils/suscripcion.js — Avisos de pago y bloqueo del panel de la dueña.
//
// Lee la fila del negocio en `suscripciones` (la misma que escribe el
// SuperAdmin al registrar un pago) y decide:
//   • faltan 3, 2 o 1 día  -> modal de aviso, cerrable, una vez al día
//   • llegó la fecha o pasó -> bloqueo del panel (las clientas NO se afectan)
//   • estado 'suspendida'   -> bloqueo inmediato (control manual del SuperAdmin)
//
// IMPORTANTE — FECHA_CORTE: al activar esto había 250 salones con
// fecha_renovacion vencida (fechas viejas de prueba) que hoy usan la app con
// normalidad. Cualquier vencimiento ANTERIOR a esta fecha se ignora por
// completo: el cobro solo cuenta desde que se registra una fecha nueva en el
// SuperAdmin. Así nadie queda bloqueado por datos antiguos.

(function () {
    'use strict';

    const FECHA_CORTE = '2026-07-19';
    const WHATSAPP_SOPORTE = '5354066204';
    const DIAS_AVISO = 3;

    function tr(txt) {
        return (typeof window.t === 'function') ? window.t(txt) : txt;
    }

    function parseFechaLocal(fecha) {
        if (fecha instanceof Date) return fecha;
        const texto = String(fecha || '').trim();
        const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
        return new Date(fecha);
    }

    function fechaLocalKey(fecha = new Date()) {
        const d = parseFechaLocal(fecha);
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')
        ].join('-');
    }

    function aMedianoche(fecha) {
        const d = parseFechaLocal(fecha);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    // Días entre hoy y la fecha de renovación (negativo = ya pasó)
    function diasHasta(fechaISO) {
        const hoy = aMedianoche(new Date());
        const objetivo = aMedianoche(fechaISO);
        return Math.round((objetivo - hoy) / 86400000);
    }

    function esFechaVieja(fechaISO) {
        return aMedianoche(fechaISO) < aMedianoche(FECHA_CORTE);
    }

    async function cargarSuscripcion(negocioId) {
        try {
            const res = await fetch(
                `${window.SUPABASE_URL}/rest/v1/suscripciones?negocio_id=eq.${negocioId}` +
                `&select=estado,fecha_renovacion&order=fecha_renovacion.desc&limit=1`,
                {
                    headers: {
                        apikey: window.SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            if (!res.ok) return null;
            const filas = await res.json();
            return filas[0] || null;
        } catch (e) {
            console.warn('[Suscripcion] No se pudo consultar:', e.message);
            return null;
        }
    }

    // Decide qué hacer. Ante cualquier duda NO bloquea (fail-open): es
    // preferible dejar entrar a alguien que deba, que dejar fuera a quien pagó.
    function evaluar(sus) {
        if (!sus) return { accion: 'nada' };

        const estado = String(sus.estado || '').toLowerCase().trim();
        if (estado === 'suspendida' || estado === 'suspendido') {
            return { accion: 'bloqueo', motivo: 'suspendida' };
        }
        if (!sus.fecha_renovacion) return { accion: 'nada' };
        if (esFechaVieja(sus.fecha_renovacion)) return { accion: 'nada' };

        const dias = diasHasta(sus.fecha_renovacion);
        if (dias <= 0) return { accion: 'bloqueo', motivo: 'vencida', fecha: sus.fecha_renovacion };
        if (dias <= DIAS_AVISO) return { accion: 'aviso', dias, fecha: sus.fecha_renovacion };
        return { accion: 'nada' };
    }

    function formatearFecha(fechaISO) {
        try {
            return parseFechaLocal(fechaISO).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long'
            });
        } catch (e) {
            return String(fechaISO).slice(0, 10);
        }
    }

    function abrirWhatsAppSoporte(texto) {
        const url = `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    }

    // ── Aviso (cerrable, una vez al día) ─────────────────────────────────
    function yaSeAvisoHoy() {
        const hoy = fechaLocalKey();
        return localStorage.getItem('avisoPagoMostrado') === hoy;
    }

    function marcarAvisoMostrado() {
        localStorage.setItem('avisoPagoMostrado', fechaLocalKey());
    }

    function mostrarAviso(dias, fecha) {
        if (document.getElementById('rservas-aviso-pago')) return;

        const titulo = dias === 1
            ? tr('Mañana toca el pago')
            : tr('Quedan {n} días para el pago').replace('{n}', dias);

        const fondo = document.createElement('div');
        fondo.id = 'rservas-aviso-pago';
        fondo.style.cssText = [
            'position:fixed', 'inset:0', 'background:rgba(0,0,0,.55)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'z-index:99999', 'padding:20px',
            'font-family:system-ui,-apple-system,sans-serif'
        ].join(';');

        fondo.innerHTML = `
            <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
                <div style="font-size:44px;line-height:1;margin-bottom:10px">⏰</div>
                <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#111">${titulo}</h2>
                <p style="margin:0 0 6px;font-size:14px;color:#555;line-height:1.5">
                    ${tr('Tu mensualidad de la app vence el')} <strong>${formatearFecha(fecha)}</strong>.
                </p>
                <p style="margin:0 0 18px;font-size:13px;color:#888;line-height:1.5">
                    ${tr('Si no se registra el pago ese día, el panel se pausa hasta que lo hagas. Tus clientas pueden seguir reservando.')}
                </p>
                <button id="rservas-aviso-pagar" style="width:100%;background:#FF1493;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">
                    ${tr('Ya pagué / Quiero pagar')}
                </button>
                <button id="rservas-aviso-cerrar" style="width:100%;background:none;border:none;color:#888;font-size:14px;padding:12px 0 0;cursor:pointer;font-family:inherit">
                    ${tr('Ahora no')}
                </button>
            </div>
        `;

        document.body.appendChild(fondo);
        marcarAvisoMostrado();

        document.getElementById('rservas-aviso-cerrar').onclick = () => fondo.remove();
        document.getElementById('rservas-aviso-pagar').onclick = () => {
            const negocio = localStorage.getItem('negocioNombre') || '';
            abrirWhatsAppSoporte(`Hola! Soy de ${negocio}. Quiero coordinar el pago de la app 💳`);
        };
    }

    // ── Bloqueo (no cerrable) ────────────────────────────────────────────
    function mostrarBloqueo(motivo, fecha) {
        if (document.getElementById('rservas-bloqueo-pago')) return;

        const capa = document.createElement('div');
        capa.id = 'rservas-bloqueo-pago';
        capa.style.cssText = [
            'position:fixed', 'inset:0', 'background:#1A1A1A',
            'display:flex', 'align-items:center', 'justify-content:center',
            'z-index:2147483647', 'padding:24px',
            'font-family:system-ui,-apple-system,sans-serif'
        ].join(';');

        const detalleFecha = fecha
            ? `${tr('Venció el')} <strong>${formatearFecha(fecha)}</strong>.`
            : tr('Tu cuenta está pausada.');

        capa.innerHTML = `
            <div style="max-width:400px;width:100%;text-align:center;color:#fff">
                <div style="font-size:56px;line-height:1;margin-bottom:14px">🔒</div>
                <h2 style="margin:0 0 10px;font-size:22px;font-weight:800">${tr('Tu panel está en pausa')}</h2>
                <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,.75);line-height:1.55">
                    ${detalleFecha}
                </p>
                <p style="margin:0 0 22px;font-size:14px;color:rgba(255,255,255,.6);line-height:1.55">
                    ${tr('Para reactivarlo, coordina el pago de tu mensualidad. Tus clientas siguen reservando con normalidad.')}
                </p>
                <button id="rservas-bloqueo-pagar" style="width:100%;background:#FF1493;color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">
                    ${tr('Coordinar mi pago')}
                </button>
                <button id="rservas-bloqueo-recargar" style="width:100%;background:rgba(255,255,255,.08);color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:600;margin-top:10px;cursor:pointer;font-family:inherit">
                    ${tr('Ya pagué, actualizar')}
                </button>
                <button id="rservas-bloqueo-salir" style="width:100%;background:none;border:none;color:rgba(255,255,255,.45);font-size:13px;padding:14px 0 0;cursor:pointer;font-family:inherit">
                    ${tr('Cerrar sesión')}
                </button>
            </div>
        `;

        document.body.appendChild(capa);
        document.body.style.overflow = 'hidden';

        document.getElementById('rservas-bloqueo-pagar').onclick = () => {
            const negocio = localStorage.getItem('negocioNombre') || '';
            abrirWhatsAppSoporte(`Hola! Soy de ${negocio}. Mi panel está pausado y quiero coordinar el pago 💳`);
        };
        document.getElementById('rservas-bloqueo-recargar').onclick = () => window.location.reload();
        document.getElementById('rservas-bloqueo-salir').onclick = () => {
            ['adminAuth', 'adminLoginTime', 'profesionalAuth', 'profesionalLoginTime'].forEach(k => localStorage.removeItem(k));
            window.location.href = 'admin-login.html';
        };
    }

    // ── Arranque ─────────────────────────────────────────────────────────
    async function revisar() {
        const haySesion = localStorage.getItem('adminAuth') === 'true' ||
                          localStorage.getItem('profesionalAuth');
        if (!haySesion) return;

        const negocioId = localStorage.getItem('negocioId');
        if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;

        const sus = await cargarSuscripcion(negocioId);
        const r = evaluar(sus);

        if (r.accion === 'bloqueo') {
            mostrarBloqueo(r.motivo, r.fecha);
        } else if (r.accion === 'aviso' && !yaSeAvisoHoy()) {
            mostrarAviso(r.dias, r.fecha);
        }
    }

    // Expuesto para poder probarlo desde la consola sin esperar fechas reales:
    //   RservasSuscripcion.probarAviso(3)  /  RservasSuscripcion.probarBloqueo()
    window.RservasSuscripcion = {
        revisar,
        evaluar,
        diasHasta,
        FECHA_CORTE,
        parseFechaLocal,
        fechaLocalKey,
        probarAviso: (dias) => mostrarAviso(dias || 3, new Date(Date.now() + (dias || 3) * 86400000).toISOString()),
        probarBloqueo: () => mostrarBloqueo('vencida', new Date().toISOString())
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(revisar, 1200));
    } else {
        setTimeout(revisar, 1200);
    }
})();
