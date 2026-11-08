// Cuentas del modo "Fechas" de la ventana de Disponibilidad (utils/timeLogic.js): sumar dias, validar el tramo,
// listar los dias y los atajos. Las fechas van como 'AAAA-MM-DD'.

const assert = require('node:assert/strict');

global.window = {};
require('../utils/timeLogic.js');
const { sumarDiasFecha, normalizarRango, diasEnRango, atajosDeRango } = global.window;

// Sumar dias, cruzando mes y año
assert.equal(sumarDiasFecha('2026-11-12', 7), '2026-11-19');
assert.equal(sumarDiasFecha('2026-11-28', 3), '2026-12-01', 'cruza de mes');
assert.equal(sumarDiasFecha('2026-12-30', 3), '2027-01-02', 'cruza de año');
assert.equal(sumarDiasFecha('2026-03-01', -1), '2026-02-28');

// "del 12 al 19 de noviembre": 8 dias, los dos extremos incluidos
const hoy = '2026-11-07';
assert.deepEqual(diasEnRango('2026-11-12', '2026-11-19', 10),
    ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
assert.deepEqual(diasEnRango('2026-11-09', '2026-11-11', 10), ['2026-11-09', '2026-11-10', '2026-11-11'], 'de lunes a miercoles');
assert.deepEqual(diasEnRango('2026-11-09', '2026-11-09', 10), ['2026-11-09'], 'un solo dia');
assert.equal(diasEnRango('2026-11-01', '2026-12-31', 10).length, 10, 'no pasa del maximo');
assert.deepEqual(diasEnRango('2026-11-12', '2026-11-10', 10), [], 'hasta antes que desde: vacio');
assert.deepEqual(diasEnRango('', '2026-11-10', 10), []);
assert.deepEqual(diasEnRango('2026-11-10', undefined, 10), []);

// Validar el tramo: nunca antes de hoy, hasta >= desde, maximo 10 dias
assert.deepEqual(normalizarRango('2026-11-12', '2026-11-19', hoy, 10), { desde: '2026-11-12', hasta: '2026-11-19' }, 'un tramo bueno no se toca');
assert.deepEqual(normalizarRango('2026-11-01', '2026-11-03', hoy, 10), { desde: hoy, hasta: hoy }, 'no se empieza en el pasado');
assert.deepEqual(normalizarRango('2026-11-12', '2026-11-10', hoy, 10), { desde: '2026-11-12', hasta: '2026-11-12' }, 'hasta antes que desde: queda un dia');
assert.deepEqual(normalizarRango('2026-11-12', '2027-02-01', hoy, 10), { desde: '2026-11-12', hasta: '2026-11-21' }, 'se recorta a 10 dias');
assert.deepEqual(normalizarRango('', '', hoy, 10), { desde: hoy, hasta: hoy }, 'vacio: hoy');
assert.deepEqual(normalizarRango('2026-11-12', '', hoy, 10), { desde: '2026-11-12', hasta: '2026-11-12' }, 'sin hasta: un dia');

// Atajos segun el dia en que se abre (el 7-11-2026 es sabado)
const por = (h) => Object.fromEntries(atajosDeRango(h).map(a => [a.texto, [a.desde, a.hasta]]));
let a = por('2026-11-07'); // sabado
assert.deepEqual(a['Próximos 3 días'], ['2026-11-07', '2026-11-09']);
assert.deepEqual(a['Hasta el domingo'], ['2026-11-07', '2026-11-08']);
assert.deepEqual(a['Fin de semana'], ['2026-11-07', '2026-11-08'], 'sabado: lo que queda del fin de semana');
a = por('2026-11-08'); // domingo
assert.deepEqual(a['Hasta el domingo'], ['2026-11-08', '2026-11-08'], 'domingo: solo hoy');
assert.deepEqual(a['Fin de semana'], ['2026-11-08', '2026-11-08']);
a = por('2026-11-09'); // lunes
assert.deepEqual(a['Hasta el domingo'], ['2026-11-09', '2026-11-15']);
assert.deepEqual(a['Fin de semana'], ['2026-11-14', '2026-11-15'], 'lunes: el sabado y el domingo que vienen');
a = por('2026-11-13'); // viernes
assert.deepEqual(a['Fin de semana'], ['2026-11-14', '2026-11-15']);
// Los atajos nunca se pasan del maximo de 10 dias
for (let d = 0; d < 7; d++) {
    for (const x of atajosDeRango(sumarDiasFecha('2026-11-09', d))) {
        assert.ok(diasEnRango(x.desde, x.hasta, 10).length >= 1 && x.hasta >= x.desde, `atajo valido ${x.texto} ${x.desde}`);
    }
}

console.log('rango-disponibilidad: OK');
