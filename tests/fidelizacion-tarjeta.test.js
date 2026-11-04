// Tarjeta de fidelidad de la clienta: cuántos sellos lleva y cuánto le falta, con las mismas cuentas que el panel.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tarjetaFidelizacion } = require('../utils/fidelizacion.js');
const turnos = require('../utils/turnos.js');

const cfg = { fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 50 };
const citas = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, filas: [{ id: i + 1 }] }));

// Sin fidelización (o con 0% de descuento) no hay tarjeta.
assert.equal(tarjetaFidelizacion({}, citas(3), 0).activa, false);
assert.equal(tarjetaFidelizacion({ ...cfg, fidelizacion_activa: false }, citas(3), 0).activa, false);
assert.equal(tarjetaFidelizacion({ ...cfg, fidelizacion_descuento_porcentaje: 0 }, citas(3), 0).activa, false);

// Con 5 citas normales, la 6ª lleva el descuento: 0 → faltan 5, 3 → faltan 2, 4 → falta 1, 5 → ya lo lleva.
const caso = (n) => tarjetaFidelizacion(cfg, citas(n), 0);
assert.deepEqual([caso(0).llenos, caso(0).faltan, caso(0).premiada], [0, 5, false]);
assert.deepEqual([caso(3).llenos, caso(3).faltan, caso(3).premiada], [3, 2, false]);
assert.deepEqual([caso(4).llenos, caso(4).faltan, caso(4).premiada], [4, 1, false]);
assert.deepEqual([caso(5).llenos, caso(5).faltan, caso(5).premiada], [5, 0, true]);
assert.equal(caso(0).sellos, 5);
assert.equal(caso(5).pct, 50);

// Al completar la cita premiada (la 6ª) empieza una tarjeta nueva, y se avisa de que acaba de cerrar la anterior.
const nueva = caso(6);
assert.deepEqual([nueva.llenos, nueva.faltan, nueva.premiada, nueva.recienPremiada], [0, 5, false, true]);
assert.equal(caso(7).recienPremiada, false);
assert.equal(caso(11).llenos, 5);
assert.equal(caso(11).premiada, true);

// Una visita con varios servicios cuenta UNA vez (mismo criterio que el panel): 3 filas seguidas = 1 cita.
const fila = (id, hora, fin) => ({ id, fecha: '2026-11-01', hora_inicio: hora, hora_fin: fin, duracion: 60, estado: 'Completado', cliente_whatsapp: '51234567' });
const combo = turnos.agruparTurnos([fila(1, '09:00', '10:00'), fila(2, '10:00', '11:00'), fila(3, '11:00', '12:00')]);
assert.equal(combo.length, 1);
assert.equal(tarjetaFidelizacion(cfg, combo, 0).visitas, 1);

// El ajuste manual de la dueña descuenta las filas más viejas (reiniciar = ajuste igual al total de filas).
assert.equal(tarjetaFidelizacion(cfg, citas(4), 4).llenos, 0);
assert.equal(tarjetaFidelizacion(cfg, citas(4), 1).visitas, 3);
assert.equal(tarjetaFidelizacion(cfg, citas(4), 99).visitas, 0);

// Cableado: la tarjeta se carga, se cachea sin conexión y aparece en la bienvenida y en Mis reservas.
const leer = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
assert.match(leer('index.html'), /utils\/fidelizacion\.js/);
assert.match(leer('index.html'), /compiled\/components\/TarjetaFidelidad\.js/);
assert.match(leer('sw.js'), /compiled\/components\/TarjetaFidelidad\.js/);
assert.match(leer('sw.js'), /utils\/fidelizacion\.js/);
assert.match(leer('components/WelcomeScreen.js'), /<window\.TarjetaFidelidad|<TarjetaFidelidad/);
assert.match(leer('components/MyBookings.js'), /<window\.TarjetaFidelidad|<TarjetaFidelidad/);
// Todo lo visible va con t() y tiene versión en inglés.
const comp = leer('components/TarjetaFidelidad.js');
['Tu tarjeta de fidelidad', 'Reservar mi cita con descuento', 'Te faltan {n} citas'].forEach(clave =>
    assert.ok(comp.includes("'" + clave + "':"), 'falta la traducción al inglés de: ' + clave));

console.log('fidelizacion-tarjeta: ok');
