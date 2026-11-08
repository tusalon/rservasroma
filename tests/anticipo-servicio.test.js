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

const { getAnticipoServicio, calcularMontoAnticipoReservaSync, decidirAnticipoManual } = cargarServicios();

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

// Alta manual desde el panel: se pide anticipo igual que a la clienta, no solo si la duena marca la casilla.
{
    const global = { requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 500 };
    const sel = [{ nombre: 'Corte', precio: 1000 }];

    assert.deepEqual({ ...decidirAnticipoManual({ requiere_anticipo: false }, sel, { esAdmin: true, quiereAdmin: true }) }, { requiere: false, sinMonto: false }, 'si el salon no pide anticipo, no hay pedido de pago');
    assert.equal(decidirAnticipoManual(global, sel, { esAdmin: true, quiereAdmin: true }).requiere, true, 'la duena con la casilla marcada');
    assert.equal(decidirAnticipoManual(global, sel, { esAdmin: true, quiereAdmin: false }).requiere, false, 'la duena puede quitarlo');
    assert.equal(decidirAnticipoManual(global, sel, { esAdmin: false, quiereAdmin: false }).requiere, true, 'una profesional no se salta el anticipo del salon');

    // Por servicio y sin monto: la duena debe corregirlo; a la profesional no se le bloquea (igual que BookingForm).
    const porServicio = { requiere_anticipo: true, anticipos_por_servicio: true, tipo_anticipo: 'fijo', valor_anticipo: 0 };
    const sinMonto = [{ nombre: 'Corte', precio: 1000, requiere_anticipo: false }];
    assert.deepEqual({ ...decidirAnticipoManual(porServicio, sinMonto, { esAdmin: true, quiereAdmin: true }) }, { requiere: true, sinMonto: true });
    assert.deepEqual({ ...decidirAnticipoManual(porServicio, sinMonto, { esAdmin: false }) }, { requiere: false, sinMonto: true });
}

// Caso Bellalys (18-10-2026): anticipo por servicio, sin global, y el servicio SI tiene anticipo propio.
// El alta manual bloqueaba con "no tiene anticipo configurado" porque le pasaba mal la seleccion.
{
    const bellalys = { requiere_anticipo: true, anticipos_por_servicio: true, tipo_anticipo: 'fijo', valor_anticipo: null };
    const conAnticipo = { nombre: 'Corte', precio: 1000, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 300 };
    const otro = { nombre: 'Tinte', precio: 2000, requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 500 };
    assert.deepEqual({ ...decidirAnticipoManual(bellalys, [conAnticipo], { esAdmin: true, quiereAdmin: true }) }, { requiere: true, sinMonto: false }, 'un servicio con anticipo propio no es "sin monto"');
    assert.deepEqual({ ...decidirAnticipoManual(bellalys, [conAnticipo, otro], { esAdmin: true, quiereAdmin: true }) }, { requiere: true, sinMonto: false }, 'varios servicios');
}

// Caso Masajes Natali (07-11-2026): servicios en USD y anticipo fijo de 500 por transferencia en CUP.
// Antes el anticipo fijo iba siempre en la moneda de WhatsApp (USD): poner 500 habria pedido 500 USD.
{
    const { getMonedaAnticipo, getMonedaAnticipoNegocio } = cargarServicios();
    const servicio = { nombre: 'Mad Abdomen', precio: 3, precio_moneda: 'USD' };
    const otroServicio = { nombre: 'Cavitacion', precio: 5, precio_moneda: 'USD' };
    const base = { requiere_anticipo: true, tipo_anticipo: 'fijo', valor_anticipo: 500, whatsapp_moneda: 'USD' };

    assert.equal(getMonedaAnticipo(base, servicio), 'USD', 'sin moneda_anticipo todo sigue como siempre: la de WhatsApp');
    assert.equal(getMonedaAnticipo({ ...base, moneda_anticipo: 'CUP' }, servicio), 'CUP', 'con moneda_anticipo manda esa');
    assert.equal(getMonedaAnticipo({ ...base, moneda_anticipo: 'cup' }, servicio), 'CUP', 'sin importar mayusculas');
    assert.equal(getMonedaAnticipo({ ...base, moneda_anticipo: 'XYZ' }, servicio), 'USD', 'una moneda rara se ignora');
    assert.equal(getMonedaAnticipo({ ...base, moneda_anticipo: '' }, servicio), 'USD', 'vacio = la de WhatsApp');
    assert.equal(getMonedaAnticipo({ ...base, moneda_anticipo: 'CUP' }, { esMultiple: true, servicios: [servicio, otroServicio] }), 'CUP', 'un combo tambien');
    assert.equal(getMonedaAnticipoNegocio({ whatsapp_moneda: 'EUR' }), 'EUR');
    assert.equal(getMonedaAnticipoNegocio({}), 'CUP');

    // El monto fijo sale tal cual (500) y en enteros porque va en CUP
    assert.equal(calcularMontoAnticipoReservaSync({ ...base, moneda_anticipo: 'CUP' }, servicio), 500);
    // Un anticipo en PORCENTAJE sigue en la moneda del servicio aunque haya moneda_anticipo
    const porcentaje = { requiere_anticipo: true, tipo_anticipo: 'porcentaje', valor_anticipo: 50, whatsapp_moneda: 'USD', moneda_anticipo: 'CUP' };
    assert.equal(getMonedaAnticipo(porcentaje, servicio), 'USD', 'el porcentaje es del precio del servicio');
}
