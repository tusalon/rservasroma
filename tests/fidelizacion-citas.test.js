// La fidelidad cuenta por CITA (visita), no por servicio: un combo de 3 servicios son 3 filas en `reservas`
// pero suma UNA cita. Cubre citasContadas / posicionDeCita / ajusteQuitandoUnaCita (utils/fidelizacion.js)
// junto con la regla de agrupar de utils/turnos.js.

const assert = require('node:assert/strict');
const {
    citasContadas, posicionDeCita, ajusteQuitandoUnaCita, progresoFidelizacion, getFidelizacionConfig
} = require('../utils/fidelizacion.js');
const { agruparTurnos } = require('../utils/turnos.js');

const tel = '5354012345';
let n = 0;
const fila = (fecha, inicio, fin, extra = {}) =>
    ({ id: ++n, cliente_whatsapp: tel, estado: 'Completado', servicio: 'S' + n, fecha, hora_inicio: inicio, hora_fin: fin, ...extra });

// Una visita con 3 servicios seguidos + una visita de 1 servicio otro dia = 2 citas, 4 filas
const combo = [fila('2026-10-01', '10:00', '11:00'), fila('2026-10-01', '11:00', '11:45'), fila('2026-10-01', '11:45', '12:30')];
const suelta = fila('2026-10-08', '15:00', '16:00');
let citas = agruparTurnos([...combo, suelta]);
assert.equal(citas.length, 2, 'el combo cuenta una sola vez');
assert.equal(citas[0].filas.length, 3);

// Dos visitas el mismo dia con hueco entre ellas son dos citas; pegadas son una (misma regla que la agenda)
assert.equal(agruparTurnos([fila('2026-10-02', '09:00', '10:00'), fila('2026-10-02', '15:00', '16:00')]).length, 2);
assert.equal(agruparTurnos([fila('2026-10-03', '09:00', '10:00'), fila('2026-10-03', '10:00', '11:00')]).length, 1);

// Sin ajuste cuentan todas; la posicion es la de la CITA, venga de la fila que venga
assert.equal(citasContadas(citas, 0).length, 2);
assert.equal(posicionDeCita(citas, combo[0].id, 0), 1);
assert.equal(posicionDeCita(citas, combo[2].id, 0), 1, 'cualquier fila del combo da la misma posicion');
assert.equal(posicionDeCita(citas, suelta.id, 0), 2);
assert.equal(posicionDeCita(citas, 9999, 0), 0, 'una reserva que no esta no tiene posicion');

// Ciclo de 6 (cada 5): con seis visitas, la sexta es la premiada aunque la primera sea un combo de 3 filas
{
    const filas = [...combo];
    ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'].forEach((d) => filas.push(fila(d, '10:00', '11:00')));
    const seis = agruparTurnos(filas);
    assert.equal(filas.length, 8, 'ocho servicios');
    assert.equal(seis.length, 6, 'seis citas');
    const fid = getFidelizacionConfig({ fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 50 });
    const ultima = seis[5].filas[0].id;
    assert.equal(posicionDeCita(seis, ultima, 0), 6);
    assert.equal(progresoFidelizacion(citasContadas(seis, 0).length, 0, fid.ciclo).premiada, false, 'con 6 hechas ya cobro el premio: empieza de nuevo');
    assert.equal(progresoFidelizacion(5, 0, fid.ciclo).premiada, true, 'tras 5 citas la siguiente es la premiada');
}

// Ajuste en filas (como ya estaba guardado): saltarse las 3 filas del combo deja fuera la primera cita entera
assert.equal(citasContadas(citas, 3).length, 1);
assert.equal(posicionDeCita(citas, combo[1].id, 3), 0, 'su cita no cuenta');
assert.equal(posicionDeCita(citas, suelta.id, 3), 1, 'la siguiente pasa a ser la primera');
// Un ajuste que corta un combo: lo que queda de ese combo sigue siendo UNA cita
assert.equal(citasContadas(citas, 1).length, 2);
assert.equal(citasContadas(citas, 2)[0].filas.length, 1);
// Ajuste mayor que todo: nada cuenta, sin romper
assert.equal(citasContadas(citas, 50).length, 0);

// "-1 cita" quita una CITA entera (las filas de su combo), no una fila
assert.equal(ajusteQuitandoUnaCita(citas, 0), 3, 'el combo tiene 3 filas');
assert.equal(ajusteQuitandoUnaCita(citas, 3), 4, 'luego la visita suelta');
assert.equal(ajusteQuitandoUnaCita(citas, 4), 4, 'ya no queda ninguna que quitar');
assert.equal(citasContadas(citas, ajusteQuitandoUnaCita(citas, 0)).length, 1);

// Una clienta con otra estado o telefono no se mezcla (lo filtra el panel antes; aqui solo el estado)
assert.equal(agruparTurnos([fila('2026-10-20', '09:00', '10:00'), fila('2026-10-20', '10:00', '11:00', { estado: 'Ausente' })]).length, 2);

console.log('fidelizacion-citas: ok');
