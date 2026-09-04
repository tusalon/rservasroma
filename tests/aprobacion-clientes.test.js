// Comprueba la regla que decide si una clienta puede entrar al salon
// (window.clienteEstaAprobado en utils/auth-clients.js).
//
// POR QUE ESTA PRUEBA
// La aprobacion se apoya en una columna que YA existia, fecha_aprobacion, y en
// que todas las filas anteriores la traen puesta. Si alguien invierte la regla
// por accidente (tratar "sin fecha" como aprobada, o al reves), las
// consecuencias son silenciosas y graves: o entra quien no debia, o se le cierra
// la puerta de golpe a las 4144 clientas que ya venian usando la app.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargarAuthClients() {
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'utils', 'auth-clients.js'),
        'utf8'
    );

    const window = {};
    window.window = window;

    const contexto = {
        window,
        console: { log() {}, warn() {}, error() {} },
        fetch() { throw new Error('La prueba no debe consultar la red'); },
    };

    vm.runInNewContext(source, contexto, { filename: 'auth-clients.js' });
    return window;
}

const { clienteEstaAprobado } = cargarAuthClients();

// Con fecha => aprobada. Es el caso de TODA la clientela que ya existia.
{
    const cliente = { nombre: 'Celia', whatsapp: '5350289641', fecha_aprobacion: '2026-04-16T13:31:57.872703+00:00' };
    assert.equal(clienteEstaAprobado(cliente), true, 'una clienta con fecha_aprobacion debe poder entrar');
}

// Sin fecha => pendiente. Es el caso de las nuevas cuando el salon aprueba a mano.
{
    const cliente = { nombre: 'Nueva', whatsapp: '5355066204', fecha_aprobacion: null };
    assert.equal(clienteEstaAprobado(cliente), false, 'sin fecha_aprobacion la clienta queda pendiente');
}

// La columna ausente (fila vieja de un salon cuya base no la tenga) cuenta como
// pendiente, no como aprobada: ante la duda no se deja entrar sin permiso.
{
    assert.equal(clienteEstaAprobado({ nombre: 'Sin columna', whatsapp: '5355066204' }), false,
        'si no viene el campo, no se asume aprobada');
}

// Nada de lo que llegue vacio debe colarse como aprobado.
{
    assert.equal(clienteEstaAprobado(null), false, 'null no es una clienta aprobada');
    assert.equal(clienteEstaAprobado(undefined), false, 'undefined no es una clienta aprobada');
    assert.equal(clienteEstaAprobado({}), false, 'un objeto vacio no es una clienta aprobada');
}

// Una cadena vacia en la fecha tampoco vale como aprobacion.
{
    assert.equal(clienteEstaAprobado({ fecha_aprobacion: '' }), false,
        'una fecha vacia no aprueba a nadie');
}

console.log('aprobacion-clientes.test.js OK');
