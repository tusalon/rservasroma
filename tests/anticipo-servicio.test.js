// Comprueba el calculo del anticipo por servicio (window.getAnticipoServicio).
//
// El fallo que motivo esto: al activar "Usar anticipo diferente por servicio"
// el anticipo global dejaba de aplicarse, asi que los salones que no le pusieron
// monto a cada servicio cobraban 0 de anticipo en la app, y en el panel el alta
// manual se bloqueaba con "Este servicio no tiene anticipo configurado".

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'utils', 'servicios.js'),
    'utf8'
);

function cargarServicios() {
    const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
    window.window = window;

    const contexto = {
        window,
        localStorage: window.localStorage,
        document: { querySelector() { return null; }, addEventListener() {} },
        console: { log() {}, warn() {}, error() {} },
        setTimeout() { return 0; },
        clearTimeout() {},
        fetch() { throw new Error('La prueba no debe consultar la red'); }
    };

    vm.runInNewContext(source, contexto, { filename: 'servicios.js' });
    return window;
}

const { getAnticipoServicio, calcularMontoAnticipoReservaSync } = cargarServicios();

// Spa VidaMassage: global 10%, ningun servicio con anticipo propio.
{
    const config = {
        requiere_anticipo: true,
        anticipos_por_servicio: true,
        tipo_anticipo: 'porcentaje',
        valor_anticipo: 10
    };
    const servicio = { nombre: 'Maderoterapia', precio: 2000, requiere_anticipo: false, valor_anticipo: null };
    assert.equal(
        getAnticipoServicio(servicio, config),
        200,
        'sin anticipo propio debe cobrarse el global'
    );
}

// Vanesa_nailscuba: global fijo 1500, servicios sin configurar.
{
    const config = {
        requiere_anticipo: true,
        anticipos_por_servicio: true,
        tipo_anticipo: 'fijo',
        valor_anticipo: 1500
    };
    assert.equal(
        getAnticipoServicio({ nombre: 'Pedicure SPA', precio: 3000, requiere_anticipo: false }, config),
        1500,
        'el global fijo debe aplicarse a los servicios sin anticipo propio'
    );
}

// El anticipo propio del servicio sigue pisando al global.
{
    const config = {
        requiere_anticipo: true,
        anticipos_por_servicio: true,
        tipo_anticipo: 'fijo',
        valor_anticipo: 1500
    };
    const servicio = { nombre: 'Set acrilico', precio: 4000, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 200 };
    assert.equal(getAnticipoServicio(servicio, config), 200, 'el anticipo propio manda sobre el global');
}

// Anticipo propio en porcentaje.
{
    const config = { requiere_anticipo: true, anticipos_por_servicio: true, tipo_anticipo: 'fijo', valor_anticipo: 1500 };
    const servicio = { nombre: 'Uñas', precio: 4000, requiere_anticipo: true, tipo_anticipo: 'porcentaje', valor_anticipo: 25 };
    assert.equal(getAnticipoServicio(servicio, config), 1000, 'el porcentaje propio se calcula sobre el precio del servicio');
}

// Yuli GC Nails Art: ni propio ni global => 0 (el panel debe seguir avisando).
{
    const config = { requiere_anticipo: true, anticipos_por_servicio: true, tipo_anticipo: 'fijo', valor_anticipo: null };
    assert.equal(
        getAnticipoServicio({ nombre: 'Servicio de prueba', precio: 500, requiere_anticipo: false }, config),
        0,
        'sin nada configurado en ningun lado el anticipo es 0'
    );
}

// Si el negocio no pide anticipo, nada lo activa.
{
    const config = { requiere_anticipo: false, anticipos_por_servicio: true, tipo_anticipo: 'fijo', valor_anticipo: 1500 };
    const servicio = { nombre: 'Uñas', precio: 4000, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 200 };
    assert.equal(getAnticipoServicio(servicio, config), 0, 'sin requiere_anticipo global no se cobra anticipo');
}

// Reserva de varios servicios: se suman y se redondean segun la moneda.
{
    const config = {
        requiere_anticipo: true,
        anticipos_por_servicio: true,
        tipo_anticipo: 'porcentaje',
        valor_anticipo: 10,
        whatsapp_moneda: 'CUP'
    };
    const reserva = {
        esMultiple: true,
        servicios: [
            { nombre: 'Limpieza', precio: 1500, requiere_anticipo: false },
            { nombre: 'Peeling', precio: 2500, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 300 }
        ]
    };
    assert.equal(
        calcularMontoAnticipoReservaSync(config, reserva),
        450,
        'la reserva multiple suma el global del primero y el propio del segundo'
    );
}

// Modo global clasico (sin anticipos_por_servicio): no debe cambiar nada.
{
    const config = { requiere_anticipo: true, anticipos_por_servicio: false, tipo_anticipo: 'porcentaje', valor_anticipo: 30 };
    const servicio = { nombre: 'Uñas', precio: 1000, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 999 };
    assert.equal(getAnticipoServicio(servicio, config), 300, 'en modo global se ignora el anticipo propio del servicio');
}

console.log('anticipo-servicio.test.js OK');
