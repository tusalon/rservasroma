// Control de la moneda al registrar un cobro real.
//
// EL FALLO (Ritis Salón & Spa, 07-10-2026): los servicios estaban en USD y el
// formulario de cobro propone la moneda del servicio. La duena cobro en pesos,
// escribio 3024.19 y 725.81 sin cambiar el selector, y Finanzas Roma los
// guardo como USD: 2,9 millones de pesos de ingresos que nunca existieron.
//
// Un cobro que es muchas veces el precio del servicio, en una moneda que no
// es CUP, casi siempre es un monto en pesos. Antes de guardarlo se pregunta.

(function (root) {
    // Un servicio de 5 USD cobrado con 100 USD no es normal, pero sucede
    // (varios servicios, propina). A partir de 20 veces el precio, casi
    // seguro es un monto en otra moneda.
    const VECES_SOSPECHOSAS = 20;

    function aNumero(valor) {
        const n = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }

    // true si el monto parece estar en pesos (CUP) aunque la moneda elegida sea otra.
    function parecePesos(monto, precioServicios, moneda) {
        const m = String(moneda || '').toUpperCase();
        if (!m || m === 'CUP') return false;
        const cobrado = aNumero(monto);
        const precio = aNumero(precioServicios);
        if (cobrado <= 0 || precio <= 0) return false;
        return cobrado > precio * VECES_SOSPECHOSAS;
    }

    const api = { parecePesos, VECES_SOSPECHOSAS };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.cobroMoneda = api;
})(typeof window !== 'undefined' ? window : globalThis);
