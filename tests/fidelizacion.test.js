// Comprueba el calculo del sistema de fidelizacion (utils/fidelizacion.js):
// cada N citas completadas, la siguiente cita tiene descuento.

const assert = require('node:assert/strict');
const { getFidelizacionConfig, esPosicionPremiada, faltanParaPremio } = require('../utils/fidelizacion.js');

// Config apagada por defecto.
{
    const fid = getFidelizacionConfig({});
    assert.equal(fid.activa, false, 'sin config, la fidelizacion esta apagada');
}

// Activa pero sin porcentaje: no debe activarse (no hay premio real).
{
    const fid = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 0 });
    assert.equal(fid.activa, false, 'con 0% de descuento no se activa aunque el switch este encendido');
}

// Caso del pedido original: "a las 5 citas, la 6ta tiene descuento".
{
    const fid = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 50 });
    assert.equal(fid.ciclo, 6, 'con cada_citas=5 el ciclo (N normales + 1 premiada) es 6');
    assert.equal(fid.pct, 50);

    // Posiciones 1-5: citas normales.
    for (let posicion = 1; posicion <= 5; posicion++) {
        assert.equal(esPosicionPremiada(posicion, fid.ciclo), false, `la cita #${posicion} no deberia ser premiada`);
    }
    // Posicion 6: la premiada. Se repite en 12, 18...
    assert.equal(esPosicionPremiada(6, fid.ciclo), true, 'la 6ta cita debe ser la premiada');
    assert.equal(esPosicionPremiada(12, fid.ciclo), true, 'la 12va cita tambien debe ser premiada');
    assert.equal(esPosicionPremiada(7, fid.ciclo), false, 'la 7ma cita reinicia el ciclo, no es premiada');
}

// faltanParaPremio: cuantas citas completadas le faltan a la clienta.
{
    const ciclo = 6; // cada_citas = 5
    assert.equal(faltanParaPremio(0, ciclo), 5, 'clienta nueva: le faltan las 5 citas del ciclo');
    assert.equal(faltanParaPremio(4, ciclo), 1, 'con 4 completadas, le falta 1 para la premiada');
    assert.equal(faltanParaPremio(5, ciclo), 0, 'con 5 completadas, la siguiente (la 6ta) es la premiada');
    assert.equal(faltanParaPremio(6, ciclo), 5, 'tras cobrar el premio, el ciclo vuelve a empezar');
    assert.equal(faltanParaPremio(11, ciclo), 0, 'con 11 completadas, la 12va vuelve a ser premiada');
}

// Porcentajes se acotan a 0-100.
{
    const fid = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 500 });
    assert.equal(fid.pct, 100, 'el porcentaje se acota a 100 como maximo');
}

// cada_citas negativo o vacio nunca baja el ciclo de 2 (minimo 1 cita normal + la premiada).
{
    const fidNegativo = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: -3, fidelizacion_descuento_porcentaje: 50 });
    assert.equal(fidNegativo.ciclo, 2, 'cada_citas negativo se corrige al minimo (1), ciclo = 2');

    const fidVacio = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: '', fidelizacion_descuento_porcentaje: 50 });
    assert.equal(fidVacio.ciclo, 6, 'cada_citas vacio cae al default (5), ciclo = 6');
}

console.log('fidelizacion.test.js OK');
