// utils/lista-espera.js — Lista de espera por DIA (sql-lista-espera-dia.sql, 07-11-2026).
//
// La clienta se anota a un dia (manana, tarde o cualquiera; su profesional o cualquiera) desde
// TimeSlots. Cuando se cancela algo ese dia, la base se lo OFRECE a la primera de la fila y se lo guarda
// 30 minutos (funcion lista-espera); ella lo ve en la bienvenida y en Mis citas y lo reserva en un toque.
// Al reservar ese dia, su espera se cierra sola. La app nunca lee telefonos de otras: usa funciones (RPC)
// que solo devuelven lo suyo. El panel lee la lista con la sesion del panel (ListaEsperaPanel.js).
//
// Estados: 'esperando' -> 'ofrecida' (con oferta_hora/oferta_hasta) -> 'reservada'; 'cerrada' (la quitan),
// 'caducada' (paso el dia). Cuentas puras con prueba en tests/lista-espera.test.js.

(function (raiz) {
    'use strict';

    const VISIBLES = ['esperando', 'ofrecida'];

    function aMinutos(hora) {
        const partes = String(hora || '').split(':');
        return (parseInt(partes[0], 10) || 0) * 60 + (parseInt(partes[1], 10) || 0);
    }

    function hoyLocal(ahora) {
        return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    }

    // ¿La hora guardada sigue guardada? (la base la pasa a la siguiente al vencer, cada 5 minutos)
    function ofertaVigente(fila, ahoraMs = Date.now()) {
        return Boolean(fila && fila.estado === 'ofrecida' && fila.oferta_hora && fila.oferta_hasta
            && new Date(fila.oferta_hasta).getTime() > ahoraMs);
    }

    function textoFranja(franja) {
        if (franja === 'manana') return 'por la mañana';
        if (franja === 'tarde') return 'por la tarde';
        return 'a cualquier hora';
    }

    // WhatsApp de la duena cuando se le ofrecio una hora: ES una oferta, todavia no una cita.
    function mensajeOferta({ nombre, fecha, hora, profesional, salon, hasta, enlace }) {
        const saludo = nombre ? `Hola ${nombre}` : 'Hola';
        const lugar = salon ? ` en ${salon}` : '';
        const con = profesional ? ` con ${profesional}` : '';
        const guarda = hasta ? ` Te la guardamos hasta las ${hasta}.` : '';
        const reserva = enlace ? ` Resérvala aquí: ${enlace}` : ' Resérvala desde la app.';
        return `${saludo}, estabas en lista de espera${lugar}. Se liberó una hora el ${fecha} a las ${hora}${con}.${guarda}${reserva}`;
    }

    // WhatsApp cuando la duena ya le creo la cita: aqui si es verdad que tiene cita.
    function mensajeReservada({ nombre, fecha, hora, profesional, salon }) {
        const saludo = nombre ? `Hola ${nombre}` : 'Hola';
        const lugar = salon ? ` en ${salon}` : '';
        const con = profesional ? ` con ${profesional}` : '';
        return `${saludo}, se liberó una hora y te la reservamos: ${fecha} a las ${hora}${con}${lugar}. ¡Te esperamos!`;
    }

    // Panel: de hoy en adelante; arriba las que tienen hora guardada, luego por dia y orden de llegada.
    function ordenarListaEspera(filas, ahora = new Date()) {
        const hoy = hoyLocal(ahora);
        const ms = ahora.getTime();
        return (filas || [])
            .filter(f => VISIBLES.includes(f.estado) && String(f.fecha) >= hoy)
            .sort((a, b) => (ofertaVigente(b, ms) - ofertaVigente(a, ms))
                || String(a.fecha).localeCompare(String(b.fecha))
                || String(a.created_at || '').localeCompare(String(b.created_at || '')));
    }

    // Hora hasta la que se guarda, en el formato de la app (10:35 AM).
    function horaLimite(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const h = d.getHours();
        return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }

    // Una espera de combo guarda los servicios en orden con su profesional (columna combo).
    // `asignaciones` es lo que arma MultiProfesionalSelector: [{ servicio, profesional }].
    function comboDeAsignaciones(asignaciones) {
        if (!Array.isArray(asignaciones) || asignaciones.length < 2) return null;
        return asignaciones.map(a => ({
            servicio: a.servicio?.nombre || '',
            duracion: parseInt(a.servicio?.duracion, 10) || 30,
            profesional_id: a.profesional?.id ?? null,
            profesional_nombre: a.profesional?.nombre || null
        }));
    }

    // Un combo con una sola profesional se ofrece solo; con varias, lo gestiona la duena.
    function comboConVariasProfesionales(combo) {
        return new Set((combo || []).map(x => x.profesional_id).filter(x => x != null)).size > 1;
    }

    // WhatsApp de la duena a una clienta de combo con varias profesionales (no se le puede guardar una
    // hora sola): pregunta, no afirma nada.
    function mensajeBuscarHueco({ nombre, fecha, servicio, salon }) {
        const saludo = nombre ? `Hola ${nombre}` : 'Hola';
        const lugar = salon ? ` en ${salon}` : '';
        return `${saludo}, estás en nuestra lista de espera${lugar} para ${servicio} el ${fecha}. ¿Sigues interesada? Si quieres, te busco un hueco.`;
    }

    const api = { VISIBLES, aMinutos, ofertaVigente, horaLimite, comboDeAsignaciones, comboConVariasProfesionales, mensajeBuscarHueco, textoFranja, mensajeOferta, mensajeReservada, ordenarListaEspera };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    // --- Llamadas a la base (solo funciones: ver sql-lista-espera-dia.sql) ---
    async function rpc(nombre, args) {
        const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
            method: 'POST',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store',
            body: JSON.stringify(args)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    const negocio = () => (window.getNegocioId ? window.getNegocioId() : localStorage.getItem('negocioId'));
    const telefonoClienta = () => {
        try { return (window.getClienteAuthActual && window.getClienteAuthActual()?.whatsapp) || ''; } catch (e) { return ''; }
    };

    // Devuelve { ok, id } o { ok:false, motivo: 'ya_anotada' | 'fecha' | 'datos' | 'error' }.
    // Con `asignaciones` (varios servicios) se guarda el combo entero y la duracion total.
    async function unirse({ cliente, servicio, profesional, fecha, franja, cualquierProfesional, asignaciones }) {
        try {
            const combo = comboDeAsignaciones(asignaciones);
            const unaSola = combo && !comboConVariasProfesionales(combo);
            const sinProfesional = combo ? !unaSola : cualquierProfesional;
            return await rpc('lista_espera_unirse', {
                p_negocio: negocio(),
                p_nombre: cliente?.nombre || '',
                p_whatsapp: cliente?.whatsapp || '',
                p_servicio: combo ? combo.map(x => x.servicio).join(' + ') : (servicio?.nombre || ''),
                p_duracion: combo ? combo.reduce((t, x) => t + x.duracion, 0) : (parseInt(servicio?.duracion, 10) || null),
                p_profesional_id: sinProfesional ? null : (combo ? combo[0].profesional_id : (profesional?.id ?? null)),
                p_profesional_nombre: sinProfesional ? null : (combo ? combo[0].profesional_nombre : (profesional?.nombre || null)),
                p_fecha: fecha,
                p_franja: franja || 'cualquiera',
                p_combo: combo
            });
        } catch (e) {
            console.error('No se pudo anotar en la lista de espera:', e);
            return { ok: false, motivo: 'error' };
        }
    }

    async function mias(cliente) {
        if (!cliente?.whatsapp) return [];
        try { return await rpc('lista_espera_mias', { p_negocio: negocio(), p_whatsapp: cliente.whatsapp }); }
        catch (e) { return []; } // sin la funcion (SQL sin pegar) o sin red: no se muestra nada
    }

    async function salir(id, cliente) {
        try { return await rpc('lista_espera_salir', { p_id: id, p_whatsapp: cliente?.whatsapp || '' }); }
        catch (e) { console.error('No se pudo salir de la lista de espera:', e); return false; }
    }

    // Horas guardadas a otras clientas ese dia: la app las trata como ocupadas (api.js).
    async function retenidas(fecha) {
        try { return await rpc('lista_espera_retenidas', { p_negocio: negocio(), p_fecha: fecha, p_whatsapp: telefonoClienta() }); }
        catch (e) { return []; }
    }

    async function ofertasVigentes() {
        try { return Number(await rpc('lista_espera_ofertas_vigentes', { p_negocio: negocio() })) || 0; }
        catch (e) { return 0; }
    }

    window.listaEspera = Object.assign(api, { unirse, mias, salir, retenidas, ofertasVigentes });

    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        'Enviar mensajes por WhatsApp': 'Send WhatsApp messages',
        'Al crear, cambiar o cobrar una reserva, el panel abre WhatsApp con el mensaje para tu clienta.': 'When you create, change or charge a booking, the panel opens WhatsApp with the message for your client.',
        'Apagado: el panel no abre WhatsApp solo. Te deja un aviso con el botón Enviar para mandarlo cuando tú quieras.': 'Off: the panel does not open WhatsApp on its own. It leaves a notice with a Send button so you can send it when you want.',
        'WhatsApp sin enviar': 'WhatsApp not sent',
        'Enviar': 'Send',
        'Descartar': 'Dismiss',
        'Lista de espera': 'Waitlist',
        'Actualizar': 'Refresh',
        'Profesional': 'Professional',
        'Cargando...': 'Loading...',
        'Cerrar aviso': 'Dismiss notice',
        'Ver lista de espera': 'See waitlist',
        // Clienta
        'Avísame si se libera una hora': 'Let me know if a time opens up',
        'Este día está lleno': 'This day is fully booked',
        'Pero las citas a veces se cancelan.': 'But bookings sometimes get cancelled.',
        '¿Ninguna te sirve? Avísame si se libera otra': 'None works? Let me know if another opens up',
        'Te avisamos y te la guardamos 30 minutos para que la reserves.': 'We will let you know and hold it for 30 minutes so you can book it.',
        '¿Cuándo te viene bien?': 'When suits you?',
        'Por la mañana': 'Morning',
        'Por la tarde': 'Afternoon',
        'Me da igual': 'Any time',
        'Me vale cualquier profesional': 'Any professional is fine',
        'Avísame': 'Let me know',
        'Guardando...': 'Saving...',
        'Listo, estás en la lista de espera': 'Done, you are on the waitlist',
        'Si se libera una hora el {fecha}, te avisamos y te la guardamos 30 minutos.': 'If a time opens up on {fecha}, we will let you know and hold it for 30 minutes.',
        'Ya estás en la lista de espera de ese día.': 'You are already on the waitlist for that day.',
        'No se pudo anotarte en lista de espera. Intenta de nuevo.': 'Could not add you to the waitlist. Try again.',
        'Necesitas ingresar con tu WhatsApp para anotarte en lista de espera.': 'You need to sign in with your WhatsApp to join the waitlist.',
        '¡Se liberó una hora para ti!': 'A time opened up for you!',
        'Te la guardamos hasta las {hora}.': 'We are holding it until {hora}.',
        'Reservarla': 'Book it',
        'Estás en lista de espera': 'You are on the waitlist',
        'Salir': 'Leave',
        'por la mañana': 'in the morning',
        'por la tarde': 'in the afternoon',
        'a cualquier hora': 'any time',
        // Panel
        'Hora guardada': 'Time on hold',
        'Esperando': 'Waiting',
        'Guardada hasta las {hora}': 'On hold until {hora}',
        'Reservársela': 'Book it for her',
        'Avisar por WhatsApp': 'Notify on WhatsApp',
        'Quitar de la lista': 'Remove from list',
        'Cualquier profesional': 'Any professional',
        'Varias profesionales': 'Several professionals',
        'Escribirle por WhatsApp': 'Message on WhatsApp',
        'Un servicio con cada profesional: te avisamos si se libera, pero el hueco lo organiza el salón.': 'One service with each professional: we will let you know if something opens, but the salon arranges the slot.',
        'Cuando una clienta se anote en un día lleno, aparecerá aquí. Si se libera una hora, la app se la ofrece sola a la primera de la fila y se la guarda 30 minutos.': 'When a client joins a full day she will show up here. If a time opens up, the app offers it to the first in line and holds it for 30 minutes.',
        'No se pudo cargar la lista de espera.': 'Could not load the waitlist.',
        'No se pudo actualizar. Inténtalo de nuevo.': 'Could not update. Please try again.',
        '¿Quitar a {nombre} de la lista de espera?': 'Remove {nombre} from the waitlist?',
        'Esa hora ya se ocupó.': 'That time is already taken.',
        'Cita creada para {nombre}.': 'Booking created for {nombre}.',
        'La lista de espera tiene teléfonos de tus clientas: confirma tu contraseña para verla.': 'The waitlist has your clients\' phone numbers: confirm your password to see it.',
        'Ver la lista': 'See the list',
        'Hay {n} hora(s) guardadas a clientas en lista de espera.': '{n} time(s) on hold for waitlisted clients.'
    });
})(typeof window !== 'undefined' ? window : globalThis);
