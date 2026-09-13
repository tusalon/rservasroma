// Comprueba el reconocimiento de clientas por teléfono al crear una reserva
// a mano (utils/clientes-conocidos.js).
//
// Lo que protege: el mismo número está guardado de formas distintas según
// cómo se creó cada reserva ("5401 2345", "+53 54012345", "5354012345"). Si
// no se comparan normalizados, la dueña escribe el teléfono de una clienta de
// toda la vida y el panel actúa como si no la conociera. Y al revés: si el
// umbral de dígitos fuera demasiado bajo, con dos teclas ya le saltaría un
// nombre cualquiera.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { indexarClientesConocidos, buscarClienteConocido } =
    require('../utils/clientes-conocidos.js');

// El normalizador REAL del panel, no uno de mentira: es justo la pieza que
// decide si dos escrituras del mismo número se consideran iguales.
function cargarNormalizadorReal() {
    const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'phone-utils.js'), 'utf8');
    const window = { localStorage: { getItem: () => null, setItem() {} } };
    window.window = window;
    vm.runInNewContext(fuente, {
        window,
        localStorage: window.localStorage,
        console: { log() {} }
    }, { filename: 'phone-utils.js' });
    // SIN pasarle el codigo de pais: es la unica forma en que quita el
    // prefijo. Pasandoselo devuelve los digitos tal cual y "5354012345" nunca
    // coincidiria con "54012345". Ese fallo lo cazo esta prueba.
    return (valor) => window.normalizarTelefonoLocal(valor);
}

const norm = cargarNormalizadorReal();

const RESERVAS = [
    { cliente_nombre: 'Yamila',          cliente_whatsapp: '54012345',   fecha: '2026-01-10', hora_inicio: '09:00' },
    { cliente_nombre: 'Yamila Corrales', cliente_whatsapp: '5354012345', fecha: '2026-03-02', hora_inicio: '10:00' },
    { cliente_nombre: 'Yamila Corrales', cliente_whatsapp: '+53 5401 2345', fecha: '2026-02-01', hora_inicio: '11:00' },
    { cliente_nombre: 'Dianelys',        cliente_whatsapp: '52083376',   fecha: '2026-02-20', hora_inicio: '12:00' },
    { cliente_nombre: '',                cliente_whatsapp: '54099887',   fecha: '2026-02-21', hora_inicio: '13:00' },
    { cliente_nombre: 'Sin telefono',    cliente_whatsapp: '',           fecha: '2026-02-22', hora_inicio: '14:00' }
];

const indice = indexarClientesConocidos(RESERVAS, norm);

// --- El mismo número escrito de tres formas es UNA clienta ---
{
    const yamila = buscarClienteConocido(indice, '54012345', norm);
    assert.ok(yamila, 'tiene que reconocerla');
    assert.equal(yamila.turnos, 3, 'las tres escrituras del número son la misma persona');

    // Y da igual cómo lo teclee la dueña ahora.
    assert.equal(buscarClienteConocido(indice, '+53 5401 2345', norm).turnos, 3);
    assert.equal(buscarClienteConocido(indice, '5354012345', norm).turnos, 3);
}

// --- Gana el nombre más reciente ---
{
    const yamila = buscarClienteConocido(indice, '54012345', norm);
    assert.equal(yamila.nombre, 'Yamila Corrales',
        'si la dueña corrigió el nombre después, vale la corrección, no el primero');
}

// --- Reservas sin nombre o sin teléfono no ensucian el índice ---
{
    assert.equal(buscarClienteConocido(indice, '54099887', norm), null,
        'una reserva sin nombre no sirve para autocompletar nada');
    assert.equal(Object.keys(indice).length, 2, 'solo Yamila y Dianelys');
}

// --- Un teléfono a medio escribir no reconoce a nadie ---
{
    assert.equal(buscarClienteConocido(indice, '5', norm), null);
    assert.equal(buscarClienteConocido(indice, '5401', norm), null,
        'con 4 dígitos todavía no se puede afirmar quién es');
    assert.ok(buscarClienteConocido(indice, '540123', norm) === null ||
              buscarClienteConocido(indice, '54012345', norm),
        'a partir de 6 dígitos ya puede intentar la coincidencia exacta');
}

// --- Desconocida y basura ---
{
    assert.equal(buscarClienteConocido(indice, '59999999', norm), null, 'una clienta nueva no se reconoce');
    assert.equal(buscarClienteConocido(indice, '', norm), null);
    assert.equal(buscarClienteConocido(indice, null, norm), null);
    assert.equal(buscarClienteConocido(null, '54012345', norm), null, 'sin índice no revienta');
}

// --- Sin reservas: índice vacío, no explota ---
{
    assert.deepEqual(indexarClientesConocidos([], norm), {});
    assert.deepEqual(indexarClientesConocidos(null, norm), {});
    assert.deepEqual(indexarClientesConocidos(undefined), {});
}

// --- Sin normalizador cae a "solo dígitos" y sigue funcionando ---
{
    const simple = indexarClientesConocidos([
        { cliente_nombre: 'Ana', cliente_whatsapp: '5401 2345', fecha: '2026-01-01', hora_inicio: '09:00' }
    ]);
    assert.equal(buscarClienteConocido(simple, '54012345').nombre, 'Ana');
}

console.log('OK: clientes-conocidos.test.js');
