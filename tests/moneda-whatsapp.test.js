// El WhatsApp tiene que decir la MISMA moneda que la clienta vio al reservar.
//
// EL FALLO
// Cada servicio guarda su moneda (servicios.precio_moneda) y la pantalla la
// respeta: "25 USD". El mensaje, en cambio, usaba negocios.whatsapp_moneda,
// que vale CUP por defecto y casi nadie cambia. Medido el 23-09-2026: 23
// salones con servicios en USD/EUR y el WhatsApp diciendo otra moneda. Una
// clienta reservaba algo de 25 USD y el mensaje le decia "25 CUP".

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
        window, localStorage: window.localStorage, location: window.location,
        document: { createElement: () => ({}), querySelector: () => null },
        console: { log() {}, warn() {}, error() {} },
        URL, URLSearchParams, setTimeout: () => 0,
        fetch: () => { throw new Error('La prueba no debe consultar la red'); }
    };
    vm.runInNewContext(fs.readFileSync(path.join(raiz, 'servicios.js'), 'utf8'), contexto);
    window.salonServicios = { getAll: async () => servicios };
    vm.runInNewContext(fs.readFileSync(path.join(raiz, 'whatsapp-helper.js'), 'utf8'), contexto);
    return contexto;
}

// Asi estan 19 de los 23: servicios en USD, WhatsApp sin tocar (CUP).
const NEGOCIO_SIN_TOCAR = { whatsapp_moneda: 'CUP', whatsapp_mostrar_costos: true };

(async () => {
    // --- El caso de la queja: servicio en USD, negocio en CUP ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Masaje', precio: 25, precio_moneda: 'USD' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Masaje' });
        assert.equal(w.generarLineaTotalReserva(total, NEGOCIO_SIN_TOCAR).trim(),
            '💵 *Total a pagar:* 25.00 USD', 'dice USD, que es lo que vio');
    }

    // --- Lo mismo con el total ya guardado en la reserva ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Masaje', precio: 25, precio_moneda: 'USD' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Masaje', total_pagar: 25 });
        assert.equal(w.formatearMontoWhatsApp(total, NEGOCIO_SIN_TOCAR), '25.00 USD');
    }

    // --- Rango en USD ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Uñas', precio: 15, precio_desde: 15, precio_hasta: 25, precio_moneda: 'USD' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Uñas' });
        assert.equal(w.formatearMontoWhatsApp(total, NEGOCIO_SIN_TOCAR), 'entre 15.00 y 25.00 USD');
    }

    // --- Servicios MEZCLADOS (como LAG Barberia): no se suman monedas ---
    {
        const w = cargarHelper([
            { id: 1, nombre: 'Corte', precio: 500, precio_moneda: 'CUP' },
            { id: 2, nombre: 'Tinte', precio: 10, precio_moneda: 'USD' }
        ]);
        const total = await w.calcularTotalReserva({ servicio: 'Corte + Tinte' });
        assert.equal(w.formatearMontoWhatsApp(total, NEGOCIO_SIN_TOCAR), '500 CUP + 10.00 USD',
            'nunca "510 CUP"');
    }

    // --- El caso contrario (Ohana): negocio en USD, servicios en CUP ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Manicura', precio: 800, precio_moneda: 'CUP' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Manicura' });
        assert.equal(w.formatearMontoWhatsApp(total, { whatsapp_moneda: 'USD' }), '800 CUP');
    }

    // --- Los 400 y pico que todo lo tienen en CUP: exactamente igual que antes ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Manicura', precio: 500, precio_moneda: 'CUP' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Manicura' });
        assert.equal(w.formatearMontoWhatsApp(total, NEGOCIO_SIN_TOCAR), '500 CUP');
    }

    // --- Anticipo ---
    {
        const w = cargarHelper([{ id: 1, nombre: 'Masaje', precio: 20, precio_moneda: 'USD' }]);
        const total = await w.calcularTotalReserva({ servicio: 'Masaje' });
        // Porcentaje: sale del precio del servicio -> moneda del servicio.
        assert.equal(w.monedaDelAnticipo({ whatsapp_moneda: 'CUP', tipo_anticipo: 'porcentaje' }, total), 'USD');
        // Fijo global: lo escribio la duena en Editar Negocio -> moneda del negocio.
        assert.equal(w.monedaDelAnticipo({ whatsapp_moneda: 'CUP', tipo_anticipo: 'fijo' }, total), 'CUP');
        // Por servicio: va junto al precio del servicio -> moneda del servicio.
        assert.equal(w.monedaDelAnticipo({ whatsapp_moneda: 'CUP', anticipos_por_servicio: true }, total), 'USD');
    }

    console.log('OK: moneda-whatsapp.test.js');
})().catch((error) => { console.error(error); process.exit(1); });
