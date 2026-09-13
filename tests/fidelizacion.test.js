// Comprueba el calculo del sistema de fidelizacion (utils/fidelizacion.js):
// cada N citas completadas, la siguiente cita tiene descuento.

const assert = require('node:assert/strict');
const {
    getFidelizacionConfig, esPosicionPremiada, faltanParaPremio,
    progresoFidelizacion, ajusteParaReiniciar, ajusteQuitandoUna
} = require('../utils/fidelizacion.js');

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

// --- Progreso "3/6" y ajustes a mano ---
// Lo que protege: la duena ve un contador y dos botones. Si la cuenta se va,
// le promete un descuento a una clienta que no toca, o se lo niega a una que
// si. Y el ajuste tiene que aguantar que la clienta siga completando citas.
{
    const ciclo = 6; // cada_citas = 5

    // Sin ajuste, el contador es la posicion dentro del ciclo.
    assert.equal(progresoFidelizacion(3, 0, ciclo).enCiclo, 3, 'con 3 completadas va 3/6');
    assert.equal(progresoFidelizacion(3, 0, ciclo).faltan, 2, 'de 3/6 le faltan 2 antes de la premiada');
    assert.equal(progresoFidelizacion(5, 0, ciclo).premiada, true, 'en 5/6 la siguiente es la premiada');
    assert.equal(progresoFidelizacion(6, 0, ciclo).enCiclo, 0, 'cobrada la premiada, el ciclo vuelve a 0/6');

    // Quitar una cita retrocede el contador.
    assert.equal(progresoFidelizacion(3, 1, ciclo).enCiclo, 2, 'quitando 1 de 3 completadas queda 2/6');
    assert.equal(progresoFidelizacion(3, 1, ciclo).efectivas, 2);

    // Reiniciar deja el contador en cero aunque tenga historial largo.
    assert.equal(progresoFidelizacion(37, ajusteParaReiniciar(37), ciclo).enCiclo, 0,
        'reiniciar a una clienta con 37 citas la deja en 0/6');

    // Y despues de reiniciar, la siguiente cita completada vuelve a sumar:
    // el ajuste es un desplazamiento fijo, no un contador congelado.
    assert.equal(progresoFidelizacion(38, ajusteParaReiniciar(37), ciclo).enCiclo, 1,
        'tras reiniciar, la cita siguiente cuenta como 1/6');

    // El ajuste nunca deja el contador en negativo aunque se quede viejo
    // (por ejemplo si se borraron reservas completadas despues de ajustar).
    const desfasado = progresoFidelizacion(2, 10, ciclo);
    assert.equal(desfasado.efectivas, 0, 'un ajuste mayor que el total no baja de 0');
    assert.equal(desfasado.enCiclo, 0);

    // Quitar de una clienta sin citas no genera un ajuste imposible.
    assert.equal(ajusteQuitandoUna(0, 0), 0, 'sin citas completadas no hay nada que quitar');
    assert.equal(ajusteQuitandoUna(3, 0), 1);
    assert.equal(ajusteQuitandoUna(3, 2), 3);
    assert.equal(ajusteQuitandoUna(3, 3), 3, 'el ajuste no puede pasar del total real');

    // Valores basura no rompen la cuenta.
    assert.equal(progresoFidelizacion(null, null, ciclo).enCiclo, 0);
    assert.equal(progresoFidelizacion('4', '1', ciclo).enCiclo, 3, 'acepta numeros como texto');
    assert.equal(progresoFidelizacion(3, 0, 0).enCiclo, 0, 'ciclo 0 no revienta ni divide por cero');
}

console.log('fidelizacion.test.js OK');
