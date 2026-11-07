// Cuentas de la lista de espera del panel (utils/lista-espera.js): cuando el turno
// esta libre, el mensaje a la clienta y el orden de la lista. Mas el interruptor
// "Enviar mensajes por WhatsApp" de utils/whatsapp-helper.js.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const l = require('../utils/lista-espera.js');

// --- ¿Sigue guardada la hora?
const ahoraMs = new Date('2026-11-09T14:00:00Z').getTime();
assert.equal(l.ofertaVigente({ estado: 'ofrecida', oferta_hora: '10:30', oferta_hasta: '2026-11-09T14:20:00Z' }, ahoraMs), true);
assert.equal(l.ofertaVigente({ estado: 'ofrecida', oferta_hora: '10:30', oferta_hasta: '2026-11-09T13:59:00Z' }, ahoraMs), false, 'vencida');
assert.equal(l.ofertaVigente({ estado: 'esperando', oferta_hasta: '2026-11-09T14:20:00Z' }, ahoraMs), false, 'sin oferta');
assert.equal(l.ofertaVigente(null, ahoraMs), false);

assert.equal(l.horaLimite(new Date(2026, 10, 9, 13, 5).toISOString()), '1:05 PM');
assert.equal(l.horaLimite(new Date(2026, 10, 9, 0, 30).toISOString()), '12:30 AM');
assert.equal(l.horaLimite('no-es-fecha'), '');
assert.equal(l.textoFranja('manana'), 'por la mañana');
assert.equal(l.textoFranja('tarde'), 'por la tarde');
assert.equal(l.textoFranja('cualquiera'), 'a cualquier hora');

// --- Mensajes: la oferta NO dice que ya tenga cita; la reservada si
const oferta = l.mensajeOferta({ nombre: 'Ana', fecha: 'lunes 9 de noviembre', hora: '10:30 AM', profesional: 'Naomi', salon: 'Masajes N', hasta: '11:05 AM', enlace: 'https://x/?s=n' });
assert.equal(oferta, 'Hola Ana, estabas en lista de espera en Masajes N. Se liberó una hora el lunes 9 de noviembre a las 10:30 AM con Naomi. Te la guardamos hasta las 11:05 AM. Resérvala aquí: https://x/?s=n');
assert.ok(!/ya tienes la cita|te esperamos/i.test(oferta), 'una oferta no es una cita');
const sinDatos = l.mensajeOferta({ nombre: '', fecha: 'hoy', hora: '9:00 AM' });
assert.ok(sinDatos.startsWith('Hola, estabas') && !/undefined| en \.|con \./.test(sinDatos), 'sin nombre, salon ni profesional');
assert.ok(sinDatos.endsWith('Resérvala desde la app.'));
assert.equal(
    l.mensajeReservada({ nombre: 'Ana', fecha: 'lunes 9', hora: '10:30 AM', profesional: 'Naomi', salon: 'Masajes N' }),
    'Hola Ana, se liberó una hora y te la reservamos: lunes 9 a las 10:30 AM con Naomi en Masajes N. ¡Te esperamos!'
);
assert.ok(!/usted|ayudarle/i.test(oferta + sinDatos), 'en tuteo');

// --- Orden del panel: horas guardadas arriba; luego por dia y llegada; fuera cerradas, reservadas y pasadas
const ahora = new Date(2026, 10, 9, 10, 0);
const filas = [
    { id: 1, estado: 'esperando', fecha: '2026-11-10', created_at: '2026-11-01' },
    { id: 2, estado: 'esperando', fecha: '2026-11-09', created_at: '2026-11-05' },
    { id: 3, estado: 'esperando', fecha: '2026-11-09', created_at: '2026-11-02' },
    { id: 4, estado: 'ofrecida', fecha: '2026-11-11', oferta_hora: '15:00', oferta_hasta: new Date(ahora.getTime() + 600000).toISOString() },
    { id: 5, estado: 'cerrada', fecha: '2026-11-09' },
    { id: 6, estado: 'reservada', fecha: '2026-11-09' },
    { id: 7, estado: 'esperando', fecha: '2026-11-08' },
];
assert.deepEqual(l.ordenarListaEspera(filas, ahora).map(f => f.id), [4, 3, 2, 1]);

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
