// Comprueba las cuentas de los cumpleaños (utils/cumpleanos.js): fechas
// validas, 29 de febrero, ventanas que cruzan el fin de año, una bonificacion
// por año y por clienta, y que no se acumula con la de fidelidad.

const assert = require('node:assert/strict');
const c = require('../utils/cumpleanos.js');

const dia = (anio, mes, d) => new Date(anio, mes - 1, d);
const k = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

// --- Fechas validas
assert.deepEqual(c.normalizarCumple('7', '10'), { dia: 7, mes: 10 });
assert.equal(c.normalizarCumple(31, 4), null, 'abril no tiene 31');
assert.equal(c.normalizarCumple(30, 2), null, 'febrero no tiene 30');
assert.deepEqual(c.normalizarCumple(29, 2), { dia: 29, mes: 2 }, '29 de febrero es una fecha valida');
assert.equal(c.normalizarCumple(1, 13), null);
assert.equal(c.normalizarCumple('', ''), null);
assert.equal(c.normalizarCumple(null, 5), null);

// --- 'AAAA-MM-DD' es un dia local, no medianoche UTC
assert.equal(c.fechaLocal('2026-10-07').getDate(), 7, 'en Cuba (UTC-4) no debe caer el dia 6');
assert.equal(k(c.fechaLocal('2026-10-07T00:00:00+00:00')), '2026-10-07');

// --- 29 de febrero
assert.equal(k(c.fechaCumpleEnAnio({ dia: 29, mes: 2 }, 2027)), '2027-02-28', 'año no bisiesto: se adelanta al 28');
assert.equal(k(c.fechaCumpleEnAnio({ dia: 29, mes: 2 }, 2028)), '2028-02-29');
assert.equal(c.cumpleEnVentana({ dia: 29, mes: 2 }, dia(2027, 2, 28), 'dia'), true);
assert.equal(c.cumpleEnVentana({ dia: 29, mes: 2 }, dia(2027, 3, 1), 'dia'), false);

// --- Mes de cumpleaños y proximo cumpleaños
assert.equal(c.esMesDeCumple({ dia: 20, mes: 10 }, dia(2026, 10, 7)), true);
assert.equal(c.esMesDeCumple({ dia: 20, mes: 11 }, dia(2026, 10, 7)), false);
assert.equal(c.esMesDeCumple(null), false);
assert.equal(c.proximoCumple({ dia: 7, mes: 10 }, dia(2026, 10, 7)).dias, 0, 'hoy cuenta');
assert.equal(c.proximoCumple({ dia: 10, mes: 10 }, dia(2026, 10, 7)).dias, 3);
assert.equal(k(c.proximoCumple({ dia: 6, mes: 10 }, dia(2026, 10, 7)).fecha), '2027-10-06', 'ya paso: el del año siguiente');
assert.equal(c.proximoCumple({ dia: 2, mes: 1 }, dia(2026, 12, 30)).dias, 3, 'cruza el fin de año');

// --- Ventanas
const cumple = { dia: 10, mes: 6 };
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 10), 'dia'), true);
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 11), 'dia'), false);
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 7), 'semana'), true, '3 dias antes');
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 13), 'semana'), true, '3 dias despues');
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 6), 'semana'), false, '4 dias antes ya no');
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 6, 30), 'mes'), true);
assert.equal(c.cumpleEnVentana(cumple, dia(2026, 7, 1), 'mes'), false);
// Fin de año: el 1 de enero visto desde el 30 de diciembre y al reves.
assert.equal(c.cumpleEnVentana({ dia: 1, mes: 1 }, dia(2026, 12, 30), 'semana'), true);
assert.equal(c.cumpleEnVentana({ dia: 1, mes: 1 }, dia(2026, 12, 30), 'dia'), false);
assert.equal(c.cumpleEnVentana({ dia: 31, mes: 12 }, dia(2027, 1, 2), 'semana'), true);
assert.equal(c.cumpleEnVentana({ dia: 31, mes: 12 }, dia(2027, 1, 2), 'mes'), false, 'enero no es el mes de un cumple de diciembre');
assert.equal(c.cumpleEnVentana(null, dia(2026, 6, 10), 'mes'), false);

// --- Configuracion de la bonificacion
assert.equal(c.bonificacionConfig({}).activa, false, 'apagada por defecto');
assert.equal(c.bonificacionConfig({ cumple_bonificacion_activa: true, cumple_bonificacion_valor: 0 }).activa, false, '0 % no es un premio');
assert.equal(c.bonificacionConfig({ cumple_bonificacion_activa: true, cumple_bonificacion_tipo: 'regalo', cumple_bonificacion_regalo: '  ' }).activa, false, 'un regalo sin texto no es un premio');
{
    const b = c.bonificacionConfig({ cumple_bonificacion_activa: true, cumple_bonificacion_tipo: 'regalo', cumple_bonificacion_regalo: 'un diseño gratis', cumple_bonificacion_ventana: 'mes' });
    assert.equal(b.activa, true);
    assert.equal(b.ventana, 'mes');
    assert.equal(b.regalo, 'un diseño gratis');
}
assert.equal(c.bonificacionConfig({ cumple_bonificacion_activa: true, cumple_bonificacion_valor: 150 }).pct, 100, 'tope 100 %');
assert.equal(c.bonificacionConfig({ cumple_bonificacion_activa: true, cumple_bonificacion_valor: 10, cumple_bonificacion_ventana: 'rara' }).ventana, 'semana', 'ventana desconocida: semana');

// --- A quien le toca
const config = { cumple_bonificacion_activa: true, cumple_bonificacion_valor: 20, cumple_bonificacion_ventana: 'semana' };
const clienta = { cumple_dia: 10, cumple_mes: 6 };
{
    const b = c.bonificacionParaCita(clienta, config, dia(2026, 6, 9));
    assert.equal(b.pct, 20);
    assert.equal(b.anio, 2026);
}
assert.equal(c.bonificacionParaCita(clienta, config, dia(2026, 7, 9)), null, 'fuera de la ventana');
assert.equal(c.bonificacionParaCita({ ...clienta, cumple_bonificacion_anio: 2026 }, config, dia(2026, 6, 9)), null, 'ya se le dio este año');
assert.ok(c.bonificacionParaCita({ ...clienta, cumple_bonificacion_anio: 2025 }, config, dia(2026, 6, 9)), 'el año pasado no cuenta');
assert.equal(c.bonificacionParaCita({}, config, dia(2026, 6, 9)), null, 'sin cumpleaños no hay bonificacion');
assert.equal(c.bonificacionParaCita(clienta, { ...config, cumple_bonificacion_activa: false }, dia(2026, 6, 9)), null);
{
    // Cumple el 1 de enero y la cita es el 30 de diciembre: el año de la
    // bonificacion es el del cumpleaños (2027), asi que la de enero de 2026 no la tapa.
    const b = c.bonificacionParaCita({ cumple_dia: 1, cumple_mes: 1, cumple_bonificacion_anio: 2026 }, config, dia(2026, 12, 30));
    assert.equal(b.anio, 2027);
}

// --- No se acumula con fidelidad: vale el mayor
assert.equal(c.cualDescuentoAplicar(20, 50), 'fidelidad');
assert.equal(c.cualDescuentoAplicar(30, 10), 'cumpleanos');
assert.equal(c.cualDescuentoAplicar(25, 25), 'cumpleanos', 'empate: el de cumpleaños');
assert.equal(c.cualDescuentoAplicar(0, 0), null);
assert.equal(c.cualDescuentoAplicar(0, 15), 'fidelidad');

// --- Textos
assert.equal(c.textoCumple({ dia: 7, mes: 10 }, 'es'), '7 de octubre');
assert.equal(c.textoCumple({ dia: 7, mes: 10 }, 'en'), 'October 7');
assert.equal(c.DESCUENTO_CUMPLE_DUENA, 30);

console.log('cumpleanos: OK');
