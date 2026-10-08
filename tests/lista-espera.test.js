// Cuentas de la lista de espera del panel (utils/lista-espera.js): cuando el turno
// esta libre, el mensaje a la clienta y el orden de la lista. Mas el interruptor
// "Enviar mensajes por WhatsApp" de utils/whatsapp-helper.js.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const l = require('../utils/lista-espera.js');

// --- ¿Esta libre el turno?
const espera = { hora_inicio: '15:00:00', hora_fin: '16:00:00' };
assert.equal(l.turnoOcupado([], espera), false, 'sin reservas esta libre');
assert.equal(l.turnoOcupado(undefined, espera), false);
assert.equal(l.turnoOcupado([{ hora_inicio: '15:00', hora_fin: '16:00', estado: 'Confirmado' }], espera), true, 'mismo turno');
assert.equal(l.turnoOcupado([{ hora_inicio: '14:30', hora_fin: '15:30', estado: 'Pendiente' }], espera), true, 'pisa el inicio');
assert.equal(l.turnoOcupado([{ hora_inicio: '15:30', hora_fin: '17:00', estado: 'Confirmado' }], espera), true, 'pisa el final');
assert.equal(l.turnoOcupado([{ hora_inicio: '14:00', hora_fin: '15:00', estado: 'Confirmado' }], espera), false, 'termina justo cuando empieza');
assert.equal(l.turnoOcupado([{ hora_inicio: '16:00', hora_fin: '17:00', estado: 'Confirmado' }], espera), false, 'empieza justo cuando termina');
assert.equal(l.turnoOcupado([{ hora_inicio: '15:00', hora_fin: '16:00', estado: 'Cancelado' }], espera), false, 'una cancelada no ocupa');
assert.equal(l.turnoOcupado([{ hora_inicio: '15:00', estado: 'Confirmado' }], { hora_inicio: '15:00', duracion: 30 }), true, 'sin hora_fin se usa la duracion');

// --- Mensaje a la clienta
assert.equal(
    l.mensajeAvisoListaEspera({ nombre: 'Ana', fecha: 'viernes 9 de octubre', hora: '3:00 PM', salon: 'Nails X' }),
    'Hola Ana, estabas en lista de espera para el viernes 9 de octubre a las 3:00 PM en Nails X. Ya tienes el turno para ese momento. ¡Te esperamos!'
);
const sinSalon = l.mensajeAvisoListaEspera({ nombre: '', fecha: 'hoy', hora: '9:00 AM' });
assert.ok(sinSalon.startsWith('Hola, estabas'), 'sin nombre no queda "Hola undefined"');
assert.ok(!/undefined| en \./.test(sinSalon), 'sin salon no se escribe " en "');
assert.ok(!/usted|ayudarle/i.test(sinSalon), 'en tuteo');

// --- Orden: libres primero; solo de hoy en adelante; sin las cerradas ni lo ya pasado
const ahora = new Date(2026, 9, 8, 12, 0); // 8-oct-2026, 12:00
const filas = [
    { id: 1, estado: 'esperando', fecha: '2026-10-10', hora_inicio: '09:00' },
    { id: 2, estado: 'notificada', fecha: '2026-10-12', hora_inicio: '10:00' },
    { id: 3, estado: 'cerrada', fecha: '2026-10-09', hora_inicio: '10:00' },
    { id: 4, estado: 'esperando', fecha: '2026-10-07', hora_inicio: '10:00' },
    { id: 5, estado: 'esperando', fecha: '2026-10-08', hora_inicio: '11:00' },
    { id: 6, estado: 'avisada', fecha: '2026-10-08', hora_inicio: '15:00' },
    { id: 7, estado: 'esperando', fecha: '2026-10-08', hora_inicio: '13:00' },
];
const ids = l.ordenarListaEspera(filas, { 2: true, 7: true }, ahora).map(f => f.id);
const idsConAvisada = l.ordenarListaEspera(filas, { 2: true, 6: true, 7: true }, ahora).map(f => f.id);
assert.deepEqual(idsConAvisada, [7, 2, 6, 1], 'una ya avisada no pasa por delante de las que faltan por avisar');
assert.deepEqual(ids, [7, 2, 6, 1], 'libres (por fecha) y luego el resto; fuera cerrada, ayer y las 11:00 de hoy');

// --- Interruptor de WhatsApp: se prueba el codigo real de whatsapp-helper.js
const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'whatsapp-helper.js'), 'utf8');
const trozo = (desde, hasta) => {
    const a = fuente.indexOf(desde);
    const b = fuente.indexOf(hasta, a);
    assert.ok(a !== -1 && b > a, `No se encontro el trozo "${desde}"`);
    return fuente.slice(a, b);
};
function montar({ ruta, envioAutomatico }) {
    const abiertos = [];
    const estado = { caja: null };
    const elemento = () => ({
        style: {}, children: [], textContent: '',
        setAttribute() {},
        append(...x) { this.children.push(...x); },
        appendChild(x) { this.children.push(x); },
        remove() {},
    });
    const ctx = {
        window: {
            location: { pathname: ruta },
            getPreferenciasWhatsAppNegocio: () => ({ envioAutomatico }),
            open: url => { abiertos.push(url); return {}; },
            t: x => x,
            normalizarTelefonoInternacional: x => String(x).replace(/\D/g, ''),
        },
        document: {
            getElementById: () => estado.caja,
            createElement: elemento,
            body: { appendChild: e => { estado.caja = e; } },
        },
        console: { log() {}, error() {} },
        encodeURIComponent,
    };
    vm.createContext(ctx);
    vm.runInContext(trozo('window.whatsappAutomaticoActivo = function', 'window.contactarSalonWhatsApp'), ctx);
    return { ctx, abiertos, avisos: () => (estado.caja ? estado.caja.children.length : 0) };
}

// Panel con el interruptor encendido: se abre WhatsApp como siempre
let m = montar({ ruta: '/rservasroma/admin.html', envioAutomatico: true });
m.ctx.window.enviarWhatsApp('53555', 'hola');
assert.equal(m.abiertos.length, 1, 'encendido: se abre');

// Panel con el interruptor apagado: no se abre solo
m = montar({ ruta: '/rservasroma/admin.html', envioAutomatico: false });
assert.equal(m.ctx.window.whatsappAutomaticoActivo(), false);
m.ctx.window.enviarWhatsApp('53555', 'hola');
assert.equal(m.abiertos.length, 0, 'apagado: no se abre solo');
assert.equal(m.avisos(), 1, 'apagado: queda el aviso con boton');
m.ctx.window.enviarWhatsApp('53555', 'hola');
assert.equal(m.avisos(), 1, 'el mismo mensaje no duplica el aviso');

// ...pero la accion manual de la admin siempre envia
m.ctx.window.enviarWhatsApp('53555', 'hola', { forzar: true });
assert.equal(m.abiertos.length, 1, 'forzar: se abre aunque este apagado');

// La app de la clienta no se ve afectada aunque el salon lo tenga apagado
m = montar({ ruta: '/rservasroma/index.html', envioAutomatico: false });
assert.equal(m.ctx.window.whatsappAutomaticoActivo(), true);
m.ctx.window.enviarWhatsApp('53555', 'hola');
assert.equal(m.abiertos.length, 1, 'clienta: se abre siempre');

// Sin dato de configuracion se comporta como hasta ahora
m = montar({ ruta: '/admin.html', envioAutomatico: undefined });
assert.equal(m.ctx.window.whatsappAutomaticoActivo(), true, 'sin la columna: encendido');

console.log('lista-espera: OK');
