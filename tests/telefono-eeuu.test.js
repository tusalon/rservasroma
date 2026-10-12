// Teléfonos de EE.UU. (+1) en salones de otros países (utils/phone-utils.js).
//
// EL FALLO (12-10-2026): el 515 465 0340 (área de Iowa) se guardó como "5154650340", sin el 1. Empieza
// por 51, el prefijo de Perú, así que al responder a esa clienta el panel abría WhatsApp con un número
// de Perú y daba error. Medido antes: los 10 dígitos con 51x/52x/53x... y forma de EE.UU. son todos de EE.UU.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(codigoSalon) {
    const almacen = new Map();
    const ventana = {
        localStorage: { getItem: (k) => (almacen.has(k) ? almacen.get(k) : null), setItem: (k, v) => almacen.set(k, v) },
    };
    const contexto = { window: ventana, localStorage: ventana.localStorage, console: { log() {} } };
    vm.createContext(contexto);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'utils', 'phone-utils.js'), 'utf8'), contexto);
    ventana.setCodigoPaisTelefono(codigoSalon);
    return ventana;
}

const cuba = cargar('53');
const norm = (v, codigo) => cuba.normalizarTelefonoInternacional(v, codigo);

// --- Sin país elegido (lo que hace "responder a la clienta" con el número guardado)
assert.equal(norm('5154650340'), '15154650340', 'guardado sin el 1: ya no se toma por Perú');
assert.equal(norm('15154650340'), '15154650340', 'guardado con el 1: igual que siempre');
assert.equal(norm('+1 515 465 0340'), '15154650340');
assert.equal(norm('5358128957'), '5358128957', 'Cuba con prefijo (53 + 8) no cambia');
assert.equal(norm('58128957'), '5358128957', 'Cuba local: se le pone el 53');
assert.equal(norm('51912345678'), '51912345678', 'Perú de verdad (51 + 9) no cambia');
assert.equal(norm('34612345678'), '34612345678', 'España con prefijo no cambia');
assert.equal(norm('2025550123'), '12025550123', 'otra área de EE.UU. sin el 1 (en un salón cubano)');
assert.equal(norm('5927123456'), '5927123456', 'Guyana (592 + 7 = 10) no cambia');

// --- Con el país elegido a mano (el registro de la clienta)
assert.equal(norm('5154650340', '1'), '15154650340', 'eligió +1 y escribió su número local');
assert.equal(norm('15154650340', '1'), '15154650340', 'eligió +1 y escribió el 1 también');
assert.equal(norm('58128957', '53'), '5358128957', 'Cuba local con Cuba elegida');
assert.equal(norm('51912345678', '53'), '51912345678', 'Cuba elegida pero escribió un número de Perú completo');
assert.equal(norm('5512345678', '52'), '525512345678', 'México local con México elegido');

// --- Un salón de EE.UU. con clientas cubanas guardadas como 53 + 8 cifras (10 en total)
const eeuu = cargar('1');
assert.equal(eeuu.normalizarTelefonoInternacional('5352492764', '1'), '5352492764', 'cubana con prefijo en un salón de EE.UU.');
assert.equal(eeuu.normalizarTelefonoInternacional('5154650340', '1'), '15154650340', 'el 515 sí es de EE.UU.');
assert.equal(eeuu.normalizarTelefonoInternacional('3055551234', '1'), '13055551234');

// --- Un número cubano local que empieza por 592 no es de Guyana (necesitaría 10 cifras)
assert.equal(cuba.normalizarTelefonoInternacional('59271701', '53'), '5359271701');

// --- Un salón de México: sus números locales de 10 cifras no se convierten en EE.UU.
const mexico = cargar('52');
assert.equal(mexico.normalizarTelefonoInternacional('5512345678'), '525512345678');
assert.equal(mexico.normalizarTelefonoInternacional('3123456789'), '523123456789', '10 cifras con forma de EE.UU. en un salón de 10 cifras locales: es local');

console.log('telefono-eeuu: ok');
