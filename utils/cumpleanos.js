// utils/cumpleanos.js — Cumpleaños de la dueña y de las clientas.
//
// DUEÑA: al abrir el panel se le pide su cumpleaños (solo dia y mes) y, en ese
// mes, se le avisa de que tiene 30 % de descuento en su suscripcion. No hay
// pasarela de pago: Raudael aplica el descuento a mano al registrar el pago en
// el SuperAdmin y deja anotado el año (negocios.cumple_descuento_anio).
//
// CLIENTAS: cada clienta puede poner su dia y mes (clientes_autorizados.cumple_*)
// y la dueña programa una bonificacion (negocios.cumple_bonificacion_*) que se
// sugiere al cobrar, igual que la fidelizacion.
//
// Se guarda SOLO dia y mes, nunca el año de nacimiento: negocios y
// clientes_autorizados se leen con la clave publica. Las columnas las crea
// sql-cumpleanos.sql; sin ellas todo esto se queda quieto y nada se rompe.

(function (raiz) {
    'use strict';

    const DESCUENTO_CUMPLE_DUENA = 30; // % sobre la suscripcion, en el mes de su cumpleaños
    const WHATSAPP_SOPORTE = '15154650340'; // el mismo que utils/suscripcion.js
    const DIAS_APLAZAR = 7;
    const MAX_DIAS_VENTANA_SEMANA = 3; // "la semana del cumpleaños" = ±3 dias

    // ─── Cuentas puras (con prueba en tests/cumpleanos.test.js) ────────────────

    function diasEnMes(mes, anio) {
        return new Date(anio, mes, 0).getDate();
    }

    // {dia, mes} valido o null. El 29 de febrero vale (se adelanta al 28 en los
    // años que no son bisiestos, ver fechaCumpleEnAnio).
    function normalizarCumple(dia, mes) {
        const d = parseInt(dia, 10);
        const m = parseInt(mes, 10);
        if (!(m >= 1 && m <= 12) || !(d >= 1)) return null;
        const maximo = m === 2 ? 29 : diasEnMes(m, 2001);
        return d <= maximo ? { dia: d, mes: m } : null;
    }

    function cumpleDe(objeto, campoDia, campoMes) {
        return objeto ? normalizarCumple(objeto[campoDia], objeto[campoMes]) : null;
    }

    // 'AAAA-MM-DD' como dia LOCAL (new Date('2026-10-07') es medianoche UTC y en
    // Cuba cae el dia anterior). Igual que parseFechaLocal de suscripcion.js.
    function fechaLocal(valor) {
        if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
        const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valor);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function fechaCumpleEnAnio(cumple, anio) {
        const dia = Math.min(cumple.dia, diasEnMes(cumple.mes, anio)); // 29-feb -> 28-feb
        return new Date(anio, cumple.mes - 1, dia);
    }

    function diasEntre(a, b) {
        return Math.round((fechaLocal(b) - fechaLocal(a)) / 86400000);
    }

    function esMesDeCumple(cumple, hoy = new Date()) {
        return Boolean(cumple) && cumple.mes === hoy.getMonth() + 1;
    }

    // Proximo cumpleaños desde hoy (hoy cuenta): { fecha, dias }.
    function proximoCumple(cumple, hoy = new Date()) {
        if (!cumple) return null;
        const base = fechaLocal(hoy);
        let fecha = fechaCumpleEnAnio(cumple, base.getFullYear());
        if (fecha < base) fecha = fechaCumpleEnAnio(cumple, base.getFullYear() + 1);
        return { fecha, dias: diasEntre(base, fecha) };
    }

    // Fecha del cumpleaños que hace que "fecha" caiga dentro de la ventana, o
    // null. ventana: 'dia' | 'semana' (±3 dias) | 'mes'. Se miran tambien el año
    // anterior y el siguiente: el 31 de diciembre esta a 1 dia del 1 de enero.
    function ocurrenciaEnVentana(cumple, fecha, ventana) {
        if (!cumple) return null;
        const f = fechaLocal(fecha);
        const anio = f.getFullYear();
        if (ventana === 'mes') {
            return cumple.mes === f.getMonth() + 1 ? fechaCumpleEnAnio(cumple, anio) : null;
        }
        const margen = ventana === 'dia' ? 0 : MAX_DIAS_VENTANA_SEMANA;
        for (const a of [anio, anio - 1, anio + 1]) {
            const ocurrencia = fechaCumpleEnAnio(cumple, a);
            if (Math.abs(diasEntre(f, ocurrencia)) <= margen) return ocurrencia;
        }
        return null;
    }

    function cumpleEnVentana(cumple, fecha, ventana) {
        return ocurrenciaEnVentana(cumple, fecha, ventana) !== null;
    }

    // Bonificacion que programo la dueña. Activa solo si hay premio real: un
    // porcentaje mayor que 0, o un regalo con texto.
    function bonificacionConfig(config) {
        const tipo = config?.cumple_bonificacion_tipo === 'regalo' ? 'regalo' : 'porcentaje';
        const pct = Math.max(0, Math.min(100, Number(config?.cumple_bonificacion_valor) || 0));
        const regalo = String(config?.cumple_bonificacion_regalo || '').trim();
        const ventana = ['dia', 'semana', 'mes'].includes(config?.cumple_bonificacion_ventana)
            ? config.cumple_bonificacion_ventana : 'semana';
        const hayPremio = tipo === 'regalo' ? regalo.length > 0 : pct > 0;
        return {
            activa: config?.cumple_bonificacion_activa === true && hayPremio,
            tipo, pct, regalo, ventana,
            mensaje: String(config?.cumple_bonificacion_mensaje || '').trim()
        };
    }

    // ¿Le toca la bonificacion a esta clienta en esta cita? Una vez por año.
    // Devuelve { tipo, pct, regalo, anio } o null.
    function bonificacionParaCita(cliente, config, fechaCita) {
        const bono = bonificacionConfig(config);
        if (!bono.activa) return null;
        const cumple = cumpleDe(cliente, 'cumple_dia', 'cumple_mes');
        const ocurrencia = ocurrenciaEnVentana(cumple, fechaCita, bono.ventana);
        if (!ocurrencia) return null;
        const anio = ocurrencia.getFullYear();
        if (Number(cliente.cumple_bonificacion_anio) === anio) return null;
        return { tipo: bono.tipo, pct: bono.pct, regalo: bono.regalo, anio };
    }

    // Descuento de la bonificacion frente al de fidelidad: no se acumulan, vale
    // el mayor. Devuelve cual aplicar: 'cumpleanos' | 'fidelidad' | null.
    function cualDescuentoAplicar(pctCumple, pctFidelidad) {
        const c = Number(pctCumple) || 0;
        const f = Number(pctFidelidad) || 0;
        if (c <= 0 && f <= 0) return null;
        return c >= f ? 'cumpleanos' : 'fidelidad';
    }

    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function nombreMes(mes, idioma) {
        return (idioma === 'en' ? MESES_EN : MESES)[(mes || 1) - 1] || '';
    }
    function textoCumple(cumple, idioma) {
        if (!cumple) return '';
        return idioma === 'en'
            ? `${nombreMes(cumple.mes, 'en')} ${cumple.dia}`
            : `${cumple.dia} de ${nombreMes(cumple.mes)}`;
    }

    const api = {
        DESCUENTO_CUMPLE_DUENA, diasEnMes, normalizarCumple, cumpleDe, fechaLocal, fechaCumpleEnAnio,
        esMesDeCumple, proximoCumple, ocurrenciaEnVentana, cumpleEnVentana, bonificacionConfig,
        bonificacionParaCita, cualDescuentoAplicar, nombreMes, textoCumple
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    window.cumpleanos = api;

    // ─── Traducciones (el diccionario es compartido: ver utils/i18n.js) ────────
    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        '¿Cuándo es tu cumpleaños?': 'When is your birthday?',
        'Tu cumpleaños (opcional)': 'Your birthday (optional)',
        'Día': 'Day',
        'Mes': 'Month',
        'Guardar': 'Save',
        'Ahora no': 'Not now',
        'Cerrar': 'Close',
        'No se pudo guardar. Inténtalo de nuevo.': 'Could not save. Please try again.',
        'Elige el día y el mes.': 'Choose the day and the month.',
        'Esa fecha no existe.': 'That date does not exist.',
        'Cuéntanoslo y, en tu mes, te hacemos un {pct} % de descuento en tu suscripción. Solo guardamos el día y el mes.': 'Tell us and, in your month, we give you {pct} % off your subscription. We only keep the day and the month.',
        'Después no podrás cambiarlo tú: si te equivocas, escríbenos.': 'You will not be able to change it yourself later: if you get it wrong, message us.',
        '¡Guardado!': 'Saved!',
        'Este mes es tu cumpleaños: tienes {pct} % de descuento en tu suscripción.': 'Your birthday is this month: you get {pct} % off your subscription.',
        'Tu descuento será en {mes}.': 'Your discount will be in {mes}.',
        '¡Feliz mes de cumpleaños!': 'Happy birthday month!',
        'Este mes tienes {pct} % de descuento en tu suscripción. Escríbenos y lo aplicamos al registrar tu pago.': 'This month you get {pct} % off your subscription. Message us and we apply it when we register your payment.',
        'Quiero mi descuento': 'I want my discount',
        'Tu salón puede tener un detalle para ti ese día.': 'Your salon may have a little gift for you that day.',
        '🎂 Cumpleaños de tus clientas': '🎂 Your clients’ birthdays',
        'Premiar los cumpleaños': 'Reward birthdays',
        'Si activas, las clientas que te digan su cumpleaños reciben un detalle: se te sugiere al cobrar y se te avisa cuando se acerca.': 'If you turn this on, clients who tell you their birthday get a treat: it is suggested when you charge and you are warned when it is near.',
        'Descuento (%)': 'Discount (%)',
        'Qué regalas': 'What you give',
        'Descuento en la cita': 'Discount on the appointment',
        'Un regalo': 'A gift',
        'Cuándo vale': 'When it applies',
        'Solo el día de su cumpleaños': 'Only on her birthday',
        'La semana de su cumpleaños (±3 días)': 'The week of her birthday (±3 days)',
        'Todo el mes de su cumpleaños': 'The whole month of her birthday',
        'Ej: un diseño gratis': 'E.g. a free design',
        'Una vez al año por clienta. No se acumula con el descuento de fidelidad: vale el mayor.': 'Once a year per client. It does not stack with the loyalty discount: the larger one applies.',
        '🎂 Cumpleaños de {nombre}: {pct}% de descuento': '🎂 {nombre}’s birthday: {pct}% off',
        '🎂 Cumpleaños de {nombre}: regalo «{regalo}»': '🎂 {nombre}’s birthday: gift “{regalo}”',
        'Cumplen años esta semana': 'Birthdays this week',
        'Felicitar': 'Congratulate',
        'hoy': 'today',
        'mañana': 'tomorrow',
        'en {n} días': 'in {n} days',
        '¡Anotado! Tu salón te lo tendrá en cuenta.': 'Noted! Your salon will keep it in mind.',
        '{salon} tiene {pct}% de descuento para ti en tu cumpleaños.': '{salon} has {pct}% off for you on your birthday.',
        '{salon} tiene un regalo para ti en tu cumpleaños: {regalo}.': '{salon} has a gift for you on your birthday: {regalo}.',
        'Tu salón': 'Your salon',
        'Guardando…': 'Saving…',
        '🎁 También es su cita premiada de fidelidad ({pct}%), pero se sugirió el descuento de cumpleaños porque es mayor.': '🎁 It is also her loyalty reward appointment ({pct}%), but the birthday discount was suggested because it is larger.',
        '🎂 Cumpleaños de {nombre}: {pct}% de descuento ya sugerido en el monto.': '🎂 {nombre}’s birthday: {pct}% off already suggested in the amount.',
        '🎂 Cumpleaños de {nombre}: {pct}% de descuento, pero se sugirió el de fidelidad porque es mayor.': '🎂 {nombre}’s birthday: {pct}% off, but the loyalty discount was suggested because it is larger.',
        'Dar la bonificación de cumpleaños (se anota que ya la recibió este año)': 'Give the birthday bonus (it is noted that she already got it this year)'
    });

    // ─── Aviso del panel de la dueña ───────────────────────────────────────────
    const tr = (txt, vars) => (typeof window.t === 'function' ? window.t(txt, vars) : String(txt).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : '')));
    const idioma = () => (typeof window.getIdioma === 'function' ? window.getIdioma() : 'es');
    const hoyKey = () => {
        const d = new Date();
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    };
    const cabeceras = (extra) => Object.assign({
        apikey: window.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    }, extra || {});
    const escapar = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const ESTILO_FONDO = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99998;padding:20px;font-family:system-ui,-apple-system,sans-serif';
    const ESTILO_TARJETA = 'background:#fff;border-radius:20px;max-width:380px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);max-height:90vh;overflow-y:auto';
    const ESTILO_BOTON = 'width:100%;background:#FF1493;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px';
    const ESTILO_LINK = 'width:100%;background:none;border:none;color:#666;font-size:14px;padding:12px 0 0;cursor:pointer;font-family:inherit;min-height:44px';
    const ESTILO_SELECT = 'flex:1;min-height:44px;border:1px solid #ccc;border-radius:10px;padding:0 10px;font-size:16px;font-family:inherit;background:#fff;color:#111';

    function hayOtroAvisoAbierto() {
        return Boolean(document.getElementById('rservas-bloqueo-pago') || document.getElementById('rservas-aviso-pago'));
    }

    function montarModal(id, html) {
        const fondo = document.createElement('div');
        fondo.id = id;
        fondo.setAttribute('role', 'dialog');
        fondo.setAttribute('aria-modal', 'true');
        fondo.style.cssText = ESTILO_FONDO;
        fondo.innerHTML = `<div style="${ESTILO_TARJETA}">${html}</div>`;
        fondo.addEventListener('click', (e) => { if (e.target === fondo) fondo.remove(); });
        document.body.appendChild(fondo);
        return fondo;
    }

    function opcionesDiaMes() {
        const dias = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
        const meses = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${escapar(nombreMes(i + 1, idioma()))}</option>`).join('');
        return { dias, meses };
    }

    function abrirWhatsAppDescuento() {
        const negocio = localStorage.getItem('negocioNombre') || '';
        const texto = `Hola! Soy de ${negocio}. Cumplo años este mes y quiero mi descuento del ${DESCUENTO_CUMPLE_DUENA} % en la mensualidad 🎂`;
        window.open(`https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`, '_blank');
    }

    function mostrarAvisoDescuento() {
        if (document.getElementById('rservas-cumple-aviso')) return;
        const fondo = montarModal('rservas-cumple-aviso', `
            <div style="font-size:44px;line-height:1;margin-bottom:10px" aria-hidden="true">🎂</div>
            <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#111">${escapar(tr('¡Feliz mes de cumpleaños!'))}</h2>
            <p style="margin:0 0 18px;font-size:14px;color:#555;line-height:1.5">${escapar(tr('Este mes tienes {pct} % de descuento en tu suscripción. Escríbenos y lo aplicamos al registrar tu pago.', { pct: DESCUENTO_CUMPLE_DUENA }))}</p>
            <button id="rservas-cumple-quiero" style="${ESTILO_BOTON}">${escapar(tr('Quiero mi descuento'))}</button>
            <button id="rservas-cumple-cerrar" style="${ESTILO_LINK}">${escapar(tr('Ahora no'))}</button>`);
        try { localStorage.setItem('cumpleAvisoMostrado', hoyKey()); } catch (e) {}
        fondo.querySelector('#rservas-cumple-quiero').onclick = () => { abrirWhatsAppDescuento(); fondo.remove(); };
        fondo.querySelector('#rservas-cumple-cerrar').onclick = () => fondo.remove();
    }

    function mostrarPedirCumple(negocioId) {
        if (document.getElementById('rservas-cumple-pedir')) return;
        const { dias, meses } = opcionesDiaMes();
        const fondo = montarModal('rservas-cumple-pedir', `
            <div style="font-size:44px;line-height:1;margin-bottom:10px" aria-hidden="true">🎂</div>
            <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#111">${escapar(tr('¿Cuándo es tu cumpleaños?'))}</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.5">${escapar(tr('Cuéntanoslo y, en tu mes, te hacemos un {pct} % de descuento en tu suscripción. Solo guardamos el día y el mes.', { pct: DESCUENTO_CUMPLE_DUENA }))}</p>
            <div style="display:flex;gap:8px;margin-bottom:8px">
                <select id="rservas-cumple-dia" aria-label="${escapar(tr('Día'))}" style="${ESTILO_SELECT}"><option value="">${escapar(tr('Día'))}</option>${dias}</select>
                <select id="rservas-cumple-mes" aria-label="${escapar(tr('Mes'))}" style="${ESTILO_SELECT};flex:2"><option value="">${escapar(tr('Mes'))}</option>${meses}</select>
            </div>
            <p style="margin:0 0 12px;font-size:12px;color:#888;line-height:1.4">${escapar(tr('Después no podrás cambiarlo tú: si te equivocas, escríbenos.'))}</p>
            <p id="rservas-cumple-error" role="alert" style="display:none;margin:0 0 10px;font-size:13px;color:#b91c1c"></p>
            <button id="rservas-cumple-guardar" style="${ESTILO_BOTON}">${escapar(tr('Guardar'))}</button>
            <button id="rservas-cumple-aplazar" style="${ESTILO_LINK}">${escapar(tr('Ahora no'))}</button>`);

        const error = (texto) => {
            const p = fondo.querySelector('#rservas-cumple-error');
            p.textContent = texto;
            p.style.display = texto ? 'block' : 'none';
        };
        fondo.querySelector('#rservas-cumple-aplazar').onclick = () => {
            try { localStorage.setItem('cumpleAdminAplazadoHasta', String(Date.now() + DIAS_APLAZAR * 86400000)); } catch (e) {}
            fondo.remove();
        };
        fondo.querySelector('#rservas-cumple-guardar').onclick = async () => {
            const dia = fondo.querySelector('#rservas-cumple-dia').value;
            const mes = fondo.querySelector('#rservas-cumple-mes').value;
            if (!dia || !mes) return error(tr('Elige el día y el mes.'));
            const cumple = normalizarCumple(dia, mes);
            if (!cumple) return error(tr('Esa fecha no existe.'));
            const boton = fondo.querySelector('#rservas-cumple-guardar');
            boton.disabled = true;
            error('');
            try {
                const respuesta = await fetch(`${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}`, {
                    method: 'PATCH',
                    headers: cabeceras({ Prefer: 'return=minimal' }),
                    body: JSON.stringify({ cumple_admin_dia: cumple.dia, cumple_admin_mes: cumple.mes })
                });
                if (!respuesta.ok) throw new Error(await respuesta.text());
            } catch (e) {
                console.warn('[Cumpleaños] No se pudo guardar:', e.message);
                boton.disabled = false;
                return error(tr('No se pudo guardar. Inténtalo de nuevo.'));
            }
            fondo.remove();
            if (esMesDeCumple(cumple)) {
                mostrarAvisoDescuento();
            } else {
                const f2 = montarModal('rservas-cumple-listo', `
                    <div style="font-size:44px;line-height:1;margin-bottom:10px" aria-hidden="true">🎉</div>
                    <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#111">${escapar(tr('¡Guardado!'))}</h2>
                    <p style="margin:0 0 18px;font-size:14px;color:#555;line-height:1.5">${escapar(tr('Tu descuento será en {mes}.', { mes: nombreMes(cumple.mes, idioma()) }))}</p>
                    <button id="rservas-cumple-ok" style="${ESTILO_BOTON}">${escapar(tr('Cerrar'))}</button>`);
                f2.querySelector('#rservas-cumple-ok').onclick = () => f2.remove();
            }
        };
        fondo.querySelector('#rservas-cumple-dia').focus();
    }

    async function revisar() {
        // Solo la dueña: a las profesionales no se les pregunta.
        if (localStorage.getItem('adminAuth') !== 'true' || localStorage.getItem('profesionalAuth')) return;
        const negocioId = localStorage.getItem('negocioId');
        if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
        if (hayOtroAvisoAbierto()) return;

        let fila;
        try {
            const respuesta = await fetch(
                `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}&select=cumple_admin_dia,cumple_admin_mes,cumple_descuento_anio`,
                { headers: cabeceras() }
            );
            // Si las columnas aun no existen (falta sql-cumpleanos.sql) responde
            // 400: no se pregunta nada en vez de pedir algo que no se puede guardar.
            if (!respuesta.ok) return;
            fila = (await respuesta.json())[0];
        } catch (e) {
            return;
        }
        if (!fila || hayOtroAvisoAbierto()) return;

        const cumple = normalizarCumple(fila.cumple_admin_dia, fila.cumple_admin_mes);
        if (!cumple) {
            const hasta = Number(localStorage.getItem('cumpleAdminAplazadoHasta')) || 0;
            if (Date.now() >= hasta) mostrarPedirCumple(negocioId);
            return;
        }
        const yaAplicado = Number(fila.cumple_descuento_anio) === new Date().getFullYear();
        if (esMesDeCumple(cumple) && !yaAplicado && localStorage.getItem('cumpleAvisoMostrado') !== hoyKey()) {
            mostrarAvisoDescuento();
        }
    }

    // Para probar desde la consola: RservasCumpleanos.probarPedir() / probarAviso()
    window.RservasCumpleanos = {
        revisar,
        probarPedir: () => mostrarPedirCumple(localStorage.getItem('negocioId')),
        probarAviso: mostrarAvisoDescuento
    };

    // El aviso solo sale en el panel (admin.html). Este mismo archivo se carga
    // tambien en la app de clientas y en Editar Negocio por sus funciones y sus
    // traducciones, y alli no debe preguntar nada.
    if (/(^|\/)admin\.html$/i.test(window.location.pathname)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(revisar, 3000));
        } else {
            setTimeout(revisar, 3000);
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
