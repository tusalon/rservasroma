// Lo que protege: qué avisos salen en rojo (errores) y qué confirmaciones
// llevan el botón rojo (lo que borra o no se puede deshacer).
const assert = require('assert');
const { esError, PELIGRO } = require('../utils/avisos-panel.js');

assert.equal(esError('Error al crear la reserva: x'), true);
assert.equal(esError('No se pudo guardar. Revisa tu conexión.'), true);
assert.equal(esError('Cambios guardados.'), false, 'Un éxito no sale en rojo');
assert.equal(esError('{nombre} ya puede reservar.'), false);

assert.equal(PELIGRO.test('¿Eliminar este servicio?'), true);
assert.equal(PELIGRO.test('¿Cancelar reserva de Ana?'), true);
assert.equal(PELIGRO.test('¿Cerrar sesión?'), false, 'Cerrar sesión no es peligroso');
assert.equal(PELIGRO.test('¿Seguro que quieres volver a abrir el local este día?'), false);

console.log('avisos-panel: ok');
