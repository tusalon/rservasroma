// Comprueba el aviso de moneda al cobrar (utils/cobro-moneda.js), con los
// números reales de Ritis Salón & Spa del 07-10-2026.

const assert = require('node:assert/strict');
const { parecePesos } = require('../utils/cobro-moneda.js');

// Limpieza facial profunda: 5 USD. Se cobraron 3024.19 pesos marcados como USD.
assert.equal(parecePesos('3024.19', 5, 'USD'), true);
// Depilación de cejas y tinte: 1.20 USD. Se cobraron 725.81 pesos marcados como USD.
assert.equal(parecePesos(725.81, 1.2, 'USD'), true);

// Cobros normales en USD: el precio, algo más, o un poco menos.
assert.equal(parecePesos(5, 5, 'USD'), false);
assert.equal(parecePesos('6,50', 5, 'USD'), false);
assert.equal(parecePesos(4, 5, 'USD'), false);
// Varios servicios o una propina grande, sin llegar a 20 veces el precio.
assert.equal(parecePesos(60, 5, 'USD'), false);

// En pesos no se pregunta nunca: un monto grande es lo normal.
assert.equal(parecePesos(3024.19, 5, 'CUP'), false);
assert.equal(parecePesos(3024.19, 5, 'cup'), false);

// Sin precio conocido o sin monto válido no se puede juzgar: no se molesta.
assert.equal(parecePesos(3024.19, 0, 'USD'), false);
assert.equal(parecePesos('', 5, 'USD'), false);
assert.equal(parecePesos('abc', 5, 'USD'), false);
assert.equal(parecePesos(100, 5, ''), false);

// Otras monedas fuertes también.
assert.equal(parecePesos(5000, 10, 'MLC'), true);
assert.equal(parecePesos(5000, 10, 'EUR'), true);

console.log('cobro-moneda: ok');
