// Comprueba que un servicio con precio en rango llega a la clienta como rango
// en el WhatsApp, no solo con el precio "desde".
//
// Lo que protege: la clienta ve "Desde 500 - 800 CUP" al elegir el servicio.
// Si el mensaje le dice "500 CUP" a secas, llega al salon esperando pagar 500
// y le cobran 800. Ese es el fallo que se arregla aqui, y el que este test
// evita que vuelva.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargarHelper(servicios) {
    const raiz = path.join(__dirname, '..', 'utils');
    const window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
    window.window = window;
    window.location = { pathname: '/rservasroma/', origin: 'https://tusalon.github.io', search: '' };

    const contexto = {
        window,
        localStorage: window.localStorage,
        location: window.location,
        document: { createElement: () => ({}), querySelector: () => null },
        console: { log() {}, warn() {}, error() {} },
        URL,
        URLSearchParams,
        setTimeout: () => 0,
        fetch: () => { throw new Error('La prueba no debe consultar la red'); }
    };

    // servicios.js trae getPrecioServicioBase/Hasta, que es lo que el helper
    // usa para saber si un servicio tiene rango.
    vm.runInNewContext(fs.readFileSync(path.join(raiz, 'servicios.js'), 'utf8'), contexto, { filename: 'servicios.js' });
    window.salonServicios = { getAll: async () => servicios };
    vm.runInNewContext(fs.readFileSync(path.join(raiz, 'whatsapp-helper.js'), 'utf8'), contexto, { filename: 'whatsapp-helper.js' });
    // El helper no exporta a window: sus funciones quedan en el global del vm,
    // que es el propio contexto.
    return contexto;
}

const CUP = { whatsapp_moneda: 'CUP', whatsapp_mostrar_costos: true };

// --- Precio fijo: nada cambia respecto a antes ---
{
    const w = cargarHelper([{ id: 1, nombre: 'Manicura', precio: 500, precio_moneda: 'CUP', activo: true }]);
    (async () => {
        const total = await w.calcularTotalReserva({ servicio: 'Manicura' });
        assert.deepEqual({ min: total.min, max: total.max }, { min: 500, max: 500 });
        assert.equal(w.formatearMontoReserva(total, 'CUP'), '500 CUP', 'un precio fijo se escribe igual que siempre');
        assert.equal(
            w.generarLineaTotalReserva(total, CUP).trim(),
            '💵 *Total a pagar:* 500 CUP'
        );
    })().catch(fallar);
}

// --- Precio en rango: el mensaje tiene que decir el rango ---
{
    const w = cargarHelper([
        { id: 2, nombre: 'Uñas acrílicas', precio_desde: 500, precio_hasta: 800, precio_moneda: 'CUP', activo: true }
    ]);
    (async () => {
        const total = await w.calcularTotalReserva({ servicio: 'Uñas acrílicas' });
        assert.deepEqual({ min: total.min, max: total.max }, { min: 500, max: 800 });
        assert.equal(w.formatearMontoReserva(total, 'CUP'), 'entre 500 y 800 CUP');
        assert.ok(
            w.generarLineaTotalReserva(total, CUP).includes('entre 500 y 800 CUP'),
            'la linea del total lleva el rango'
        );
    })().catch(fallar);
}

// --- El total guardado en la fila no puede tapar el rango ---
// Esta es la trampa: la reserva guarda total_pagar calculado con el "desde".
{
    const w = cargarHelper([
        { id: 3, nombre: 'Pedicura spa', precio_desde: 300, precio_hasta: 450, precio_moneda: 'CUP', activo: true }
    ]);
    (async () => {
        const total = await w.calcularTotalReserva({ servicio: 'Pedicura spa', total_pagar: 300 });
        assert.equal(total.max, 450, 'el rango del servicio manda sobre el total guardado');
        assert.equal(w.formatearMontoReserva(total, 'CUP'), 'entre 300 y 450 CUP');
    })().catch(fallar);
}

// --- Varios servicios: se suman los dos extremos ---
{
    const w = cargarHelper([
        { id: 4, nombre: 'Manicura', precio: 500, precio_moneda: 'CUP', activo: true },
        { id: 5, nombre: 'Diseño 3D', precio_desde: 200, precio_hasta: 600, precio_moneda: 'CUP', activo: true }
    ]);
    (async () => {
        const total = await w.calcularTotalReserva({ servicio: 'Manicura + Diseño 3D' });
        assert.deepEqual({ min: total.min, max: total.max }, { min: 700, max: 1100 },
            'el minimo suma los "desde" y el maximo los "hasta"');
        assert.equal(w.formatearMontoReserva(total, 'CUP'), 'entre 700 y 1100 CUP');
    })().catch(fallar);
}

// --- Si el salon apaga los costos, no se enseña nada ---
{
    const w = cargarHelper([
        { id: 6, nombre: 'Uñas', precio_desde: 500, precio_hasta: 800, precio_moneda: 'CUP', activo: true }
    ]);
    (async () => {
        const total = await w.calcularTotalReserva({ servicio: 'Uñas' });
        assert.equal(
            w.generarLineaTotalReserva(total, { whatsapp_moneda: 'CUP', whatsapp_mostrar_costos: false }),
            '',
            'con los costos apagados el rango tampoco se cuela'
        );
    })().catch(fallar);
}

// --- Un anticipo sigue siendo un numero suelto ---
{
    const w = cargarHelper([]);
    assert.equal(w.formatearMontoReserva(250, 'CUP'), '250 CUP');
    assert.equal(w.formatearMontoReserva(12.5, 'USD'), '12.50 USD');
    assert.equal(w.formatearMontoReserva(0, 'CUP'), '', 'un importe en cero no se escribe');
}

function fallar(error) {
    console.error(error);
    process.exit(1);
}

process.on('exit', (codigo) => {
    if (codigo === 0) console.log('OK: precio-rango-whatsapp.test.js');
});
