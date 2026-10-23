// En un combo (varios servicios seguidos) CADA servicio tiene que aceptar la hora en que le toca empezar,
// no solo el primero. Cubre utils/timeLogic.js (primerServicioSinHorario) y, al mover un turno ya reservado,
// utils/turnos.js (aceptanTodosLosServicios).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'timeLogic.js'), 'utf8');
const contexto = { console: { log() {}, warn() {}, error() {} }, window: {} };
vm.runInNewContext(fuente + '\nthis.__api = { primerServicioSinHorario, servicioPermiteHorario };', contexto);
const { primerServicioSinHorario, servicioPermiteHorario } = contexto.__api;
const turnos = require('../utils/turnos.js');

const h = (hora) => turnos.aMin(hora);
const libre = { nombre: 'Corte', duracion: 60 };
// Pestanas: solo se hace a las 21:00 (el caso del pedido)
const noche = { nombre: 'Pestanas', duracion: 60, horarios_permitidos: ['21:00'] };

// Sin ninguna restriccion, todo pasa
assert.equal(primerServicioSinHorario([libre, { ...libre }], h('14:00'), 'lunes'), null);
assert.equal(primerServicioSinHorario([], h('14:00'), 'lunes'), null);

// Combo a las 14:00 con un servicio solo de 21:00 DETRAS: antes pasaba (solo se miraba el primero); ahora no
{
    const r = primerServicioSinHorario([libre, noche], h('14:00'), 'lunes');
    assert.ok(r, 'el segundo servicio caeria a las 15:00, fuera de su horario');
    assert.equal(r.indice, 1);
    assert.equal(r.hora, '15:00');
}

// Marcado a las 20:00 y el primero dura 1 h: el segundo cae a las 21:00 -> se acepta
assert.equal(primerServicioSinHorario([libre, noche], h('20:00'), 'lunes'), null);

// Si el primero dura 45 min el segundo cae a las 20:45: no es su hora, no se acepta
assert.equal(primerServicioSinHorario([{ ...libre, duracion: 45 }, noche], h('20:00'), 'lunes').hora, '20:45');

// El servicio restringido va PRIMERO: sigue valiendo lo de siempre
assert.equal(primerServicioSinHorario([noche, libre], h('21:00'), 'lunes'), null);
assert.equal(primerServicioSinHorario([noche, libre], h('14:00'), 'lunes').indice, 0);

// Tres servicios: el del medio es el que falla
{
    const medio = { nombre: 'Cejas', duracion: 30, horarios_permitidos: ['10:00'] };
    assert.equal(primerServicioSinHorario([libre, medio, libre], h('09:00'), 'martes'), null, '09:00 + 1 h = 10:00');
    assert.equal(primerServicioSinHorario([libre, medio, libre], h('09:30'), 'martes').indice, 1);
}

// Las horas por dia y "cerrado" tambien cuentan para los servicios de detras
{
    const soloMiercoles = { nombre: 'Facial', duracion: 60, horarios_permitidos_por_dia: { miercoles: ['15:00'], jueves: 'cerrado' } };
    assert.equal(primerServicioSinHorario([libre, soloMiercoles], h('14:00'), 'miercoles'), null);
    assert.equal(primerServicioSinHorario([libre, soloMiercoles], h('14:00'), 'jueves').indice, 1, 'cerrado ese dia');
    assert.equal(primerServicioSinHorario([libre, soloMiercoles], h('14:30'), 'miercoles').indice, 1);
}

// Duracion que falta o no es numero: se toma 60, como el resto de la app
assert.equal(primerServicioSinHorario([{ nombre: 'X' }, noche], h('20:00'), 'lunes'), null);

// ---- Mover un turno ya reservado: cada fila con su servicio ------------------------------------------------
{
    const servicios = { corte: libre, pestanas: noche };
    const filas = [
        { id: 1, servicio: 'Corte', hora_inicio: '20:00', hora_fin: '21:00' },
        { id: 2, servicio: 'Pestanas', hora_inicio: '21:00', hora_fin: '22:00' }
    ];
    const lunes = '2026-10-26'; // lunes
    const acepta = turnos.aceptanTodosLosServicios(filas, servicios, lunes, servicioPermiteHorario);
    assert.equal(acepta('20:00'), true, 'queda en su hora: Pestanas a las 21:00');
    assert.equal(acepta('14:00'), false, 'Pestanas caeria a las 15:00');
    assert.equal(acepta('20:30'), false, 'Pestanas caeria a las 21:30');

    // Servicio desconocido (borrado del catalogo): no bloquea
    const sinCatalogo = turnos.aceptanTodosLosServicios(filas, { corte: libre }, lunes, servicioPermiteHorario);
    assert.equal(sinCatalogo('14:00'), true);
}

console.log('combo-horarios: ok');
