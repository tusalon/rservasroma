// Comprueba los mensajes personalizables y quién cuenta como clienta nueva
// (utils/bienvenida.js).

const assert = require('node:assert/strict');
const b = require('../utils/bienvenida.js');

const datos = { cliente: 'Yadira', nombre_negocio: 'Ritis', servicio: 'Limpieza facial', fecha: 'lunes 12 de octubre', hora: '10:00', profesional: 'Ana' };

// --- Marcas
assert.equal(b.rellenar('Hola {cliente}, te esperamos en {nombre_negocio}', datos), 'Hola Yadira, te esperamos en Ritis');
assert.equal(b.rellenar('Hola {desconocida}', datos), 'Hola {desconocida}', 'una marca que no existe se deja tal cual');
assert.equal(b.rellenar('  ', datos), '');
assert.equal(b.rellenar('Hola {cliente}', {}), 'Hola {cliente}', 'sin dato, la marca se queda');

// --- Confirmación: solo si la admin la enciende
const conTexto = { mensaje_confirmacion: 'Gracias {cliente}, ya tienes tu turno', mensaje_confirmacion_activo: true };
assert.equal(b.textoConfirmacion(conTexto, datos), 'Gracias Yadira, ya tienes tu turno');
assert.equal(b.textoConfirmacion({ ...conTexto, mensaje_confirmacion_activo: false }, datos), '', 'apagado: se usa el de siempre');
assert.equal(b.textoConfirmacion({ mensaje_confirmacion_activo: true, mensaje_confirmacion: '   ' }, datos), '', 'encendido pero vacío: el de siempre');
assert.equal(b.textoConfirmacion(null, datos), '');

// --- Primera vez: el de la admin o, si no, el de RservasRoma
const propio = { mensaje_primera_vez: 'Bienvenida {cliente} a {nombre_negocio}', mensaje_primera_vez_activo: true };
assert.equal(b.textoPrimeraVez(propio, datos), 'Bienvenida Yadira a Ritis');
const defecto = b.textoPrimeraVez({ ...propio, mensaje_primera_vez_activo: false }, datos);
assert.match(defecto, /Bienvenida a Ritis/);
assert.match(defecto, /Limpieza facial, lunes 12 de octubre a las 10:00/);
assert.equal(b.textoPrimeraVez({ mensaje_primera_vez_activo: true, mensaje_primera_vez: '' }, datos), defecto, 'encendido pero vacío: el de RservasRoma');
assert.doesNotMatch(defecto, /Bienvenida a Ritis[^]*\bvos\b/i);
assert.doesNotMatch(b.MENSAJE_PRIMERA_VEZ_DEFECTO, /\$|\bUSD\b|CUP/, 'sin precios');

// --- Clientas nuevas: primera reserva, reciente y sin saludar
const hoy = '2026-10-10';
const r = (id, tel, extra = {}) => ({ id, cliente_whatsapp: tel, estado: 'Reservado', created_at: '2026-10-09T10:00:00Z', fecha: '2026-10-12', ...extra });

let nuevas = b.clientasNuevas([r(1, '5355501111')], [], hoy);
assert.equal(nuevas.length, 1);
assert.equal(nuevas[0].reserva.id, 1);

assert.equal(b.clientasNuevas([r(1, '5355501111'), r(2, '+53 555 01111', { created_at: '2026-10-10T10:00:00Z' })], [], hoy).length, 0,
    'con dos reservas ya no es nueva (el mismo número escrito distinto cuenta igual)');
assert.equal(b.clientasNuevas([r(1, '5355501111'), r(2, '5355501111', { estado: 'Cancelado' })], [], hoy).length, 1, 'una cancelada no cuenta');
assert.equal(b.clientasNuevas([r(1, '5355501111', { estado: 'Cancelado' })], [], hoy).length, 0, 'si cancelo su única reserva, no hay clienta nueva');
assert.equal(b.clientasNuevas([r(1, '5355501111', { created_at: '2026-09-01T10:00:00Z' })], [], hoy).length, 0, 'fuera de la ventana de 14 días');
assert.equal(b.clientasNuevas([r(1, '5355501111', { created_at: '2026-09-01T10:00:00Z' })], [], hoy, 60).length, 1, 'ventana ampliable');
assert.equal(b.clientasNuevas([r(1, '5355501111')], [{ whatsapp: '5355501111', bienvenida_enviada_at: '2026-10-09T12:00:00Z' }], hoy).length, 0, 'ya se le envió');
assert.equal(b.clientasNuevas([r(1, '5355501111')], [{ whatsapp: '5355501111', bienvenida_enviada_at: null }], hoy).length, 1);
assert.equal(b.clientasNuevas([r(1, '')], [], hoy).length, 0, 'sin número no se puede escribir');

nuevas = b.clientasNuevas([r(1, '111', { created_at: '2026-10-05T10:00:00Z' }), r(2, '222', { created_at: '2026-10-09T10:00:00Z' })], [], hoy);
assert.deepEqual(nuevas.map((n) => n.reserva.id), [2, 1], 'la más reciente primero');

console.log('bienvenida: ok');
