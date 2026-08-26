// Comprueba que la frase del dia sea determinista (misma frase todo el dia,
// distinta al dia siguiente) y que nunca devuelva un indice fuera de rango.

const assert = require('node:assert/strict');
const { FRASES_MOTIVACIONALES, getFraseDelDia } = require('../utils/frases-motivacionales.js');

assert.ok(FRASES_MOTIVACIONALES.length > 0, 'debe haber al menos una frase cargada');

// Misma fecha (aunque cambie la hora) => misma frase.
{
    const manana = getFraseDelDia(new Date(2026, 0, 15, 8, 0, 0));
    const noche = getFraseDelDia(new Date(2026, 0, 15, 22, 30, 0));
    assert.equal(manana, noche, 'la frase no debe cambiar durante el mismo dia');
}

// Dia siguiente => frase distinta (salvo que el banco tenga 1 sola frase).
if (FRASES_MOTIVACIONALES.length > 1) {
    const hoy = getFraseDelDia(new Date(2026, 0, 15));
    const mañana = getFraseDelDia(new Date(2026, 0, 16));
    assert.notEqual(hoy, mañana, 'al otro dia deberia tocar otra frase del banco');
}

// El indice siempre cae dentro del banco, incluso muy avanzado el año.
{
    const finDeAnio = getFraseDelDia(new Date(2026, 11, 31));
    assert.ok(FRASES_MOTIVACIONALES.includes(finDeAnio), 'la frase del 31 de diciembre debe existir en el banco');
}

console.log('frases-motivacionales.test.js OK');
