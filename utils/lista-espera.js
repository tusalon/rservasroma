// utils/lista-espera.js — Lista de espera en el panel de la admin.
//
// Las clientas se anotan en un turno ocupado (TimeSlots.js -> lista_espera). Cuando
// ese turno se libera, la admin recibe el aviso (utils/api.js) y desde su panel
// ("Lista de espera") abre WhatsApp con la clienta. Aqui estan las cuentas puras
// (con prueba en tests/lista-espera.test.js) y las traducciones.
//
// Estados de lista_espera: 'esperando' (turno aun ocupado), 'notificada' (se libero
// y falta avisarle a la clienta), 'avisada' (la admin ya abrio WhatsApp con ella) y
// 'cerrada' (fuera de la lista). El indice unico de sql-lista-espera.sql solo mira
// 'esperando' y 'notificada': una fila 'avisada' o 'cerrada' libera el sitio.

(function (raiz) {
    'use strict';

    const ESTADOS_VISIBLES = ['esperando', 'notificada', 'avisada'];

    function aMinutos(hora) {
        const partes = String(hora || '').split(':');
        return (parseInt(partes[0], 10) || 0) * 60 + (parseInt(partes[1], 10) || 0);
    }

    // ¿Alguna reserva activa de esa profesional pisa el turno de la clienta en espera?
    // `reservas` son las del dia y la profesional (getBookingsByDateAndProfesional).
    function turnoOcupado(reservas, espera) {
        const inicio = aMinutos(espera.hora_inicio);
        const fin = espera.hora_fin ? aMinutos(espera.hora_fin) : inicio + (Number(espera.duracion) || 60);
        return (reservas || []).some(r => {
            if (String(r.estado || '').toLowerCase().startsWith('cancelad')) return false;
            const rIni = aMinutos(r.hora_inicio);
            const rFin = r.hora_fin ? aMinutos(r.hora_fin) : rIni + 60;
            return rIni < fin && rFin > inicio;
        });
    }

    // Mensaje para la clienta cuando su turno esta libre.
    function mensajeAvisoListaEspera({ nombre, fecha, hora, salon }) {
        const saludo = nombre ? `Hola ${nombre}` : 'Hola';
        const lugar = salon ? ` en ${salon}` : '';
        return `${saludo}, estabas en lista de espera para el ${fecha} a las ${hora}${lugar}. Ya tienes el turno para ese momento. ¡Te esperamos!`;
    }

    // Filas que se muestran: de hoy en adelante, sin las cerradas, y sin los turnos de
    // hoy que ya empezaron. `ahora` = Date; primero las libres, luego por fecha y hora.
    function ordenarListaEspera(filas, libres, ahora = new Date()) {
        const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
        const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
        return (filas || [])
            .filter(f => ESTADOS_VISIBLES.includes(f.estado) && String(f.fecha) >= hoy)
            .filter(f => !(String(f.fecha) === hoy && aMinutos(f.hora_inicio) < minutosAhora))
            .sort((a, b) => {
                // Arriba: turno libre y aun sin avisar a la clienta.
                const la = libres && libres[a.id] && a.estado !== 'avisada' ? 0 : 1;
                const lb = libres && libres[b.id] && b.estado !== 'avisada' ? 0 : 1;
                return la - lb
                    || String(a.fecha).localeCompare(String(b.fecha))
                    || aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio);
            });
    }

    const api = { ESTADOS_VISIBLES, turnoOcupado, mensajeAvisoListaEspera, ordenarListaEspera };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    window.listaEspera = api;

    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        'Enviar mensajes por WhatsApp': 'Send WhatsApp messages',
        'Al crear, cambiar o cobrar una reserva, el panel abre WhatsApp con el mensaje para tu clienta.': 'When you create, change or charge a booking, the panel opens WhatsApp with the message for your client.',
        'Apagado: el panel no abre WhatsApp solo. Te deja un aviso con el botón Enviar para mandarlo cuando tú quieras.': 'Off: the panel does not open WhatsApp on its own. It leaves a notice with a Send button so you can send it when you want.',
        'WhatsApp sin enviar': 'WhatsApp not sent',
        'Enviar': 'Send',
        'Descartar': 'Dismiss',
        'Lista de espera': 'Waitlist',
        'Turno libre': 'Spot free',
        'Turno ocupado': 'Spot taken',
        'Avisada': 'Notified',
        'Avisar por WhatsApp': 'Notify on WhatsApp',
        'Quitar de la lista': 'Remove from list',
        'Actualizar': 'Refresh',
        'Ese turno ya se ocupó de nuevo.': 'That spot has been taken again.',
        'Cuando una clienta se anote en un turno lleno, aparecerá aquí.': 'When a client joins a full spot, she will show up here.',
        'No se pudo cargar la lista de espera.': 'Could not load the waitlist.',
        'No se pudo actualizar. Inténtalo de nuevo.': 'Could not update. Please try again.',
        '¿Quitar a {nombre} de la lista de espera?': 'Remove {nombre} from the waitlist?',
        'Se liberó un turno y {nombre} está en lista de espera.': 'A spot opened up and {nombre} is on the waitlist.',
        'Se liberaron {n} turnos con clientas en lista de espera.': '{n} spots opened up with clients on the waitlist.',
        'Ver lista de espera': 'See waitlist',
        'Cerrar aviso': 'Dismiss notice',
        'Profesional': 'Professional',
        'Cargando...': 'Loading...'
    });
})(typeof window !== 'undefined' ? window : globalThis);
