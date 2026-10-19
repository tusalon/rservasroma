// Horarios permitidos de un servicio por dia de la semana (utils/timeLogic.js).
//
// Regla: un dia con horas propias (servicios.horarios_permitidos_por_dia) manda sobre la lista general
// SOLO ese dia; los demas dias siguen con horarios_permitidos; y un servicio sin ninguna restriccion
// deja pasar todo, igual que antes de existir esta columna.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'timeLogic.js'), 'utf8');
const contexto = { console: { log() {}, warn() {}, error() {} }, window: {} };
vm.runInNewContext(fuente + '\nthis.__api = { horariosPermitidosDelDia, servicioRestringeHorarios, servicioPermiteHorario, servicioCerradoEseDia };', contexto);
const { horariosPermitidosDelDia, servicioRestringeHorarios, servicioPermiteHorario, servicioCerradoEseDia } = contexto.__api;

// Sin restriccion: todo pasa, a cualquier dia y con o sin el dia
{
    const libre = { nombre: 'Corte' };
    assert.equal(servicioRestringeHorarios(libre, 'lunes'), false);
    assert.equal(servicioPermiteHorario(libre, '09:00', 'lunes'), true);
    assert.equal(servicioPermiteHorario(libre, '09:00'), true);
}

// Solo lista general (como siempre): vale todos los dias
{
    const general = { horarios_permitidos: ['09:00', '11:00'] };
    assert.equal(servicioRestringeHorarios(general, 'jueves'), true);
    assert.equal(servicioPermiteHorario(general, '09:00', 'jueves'), true);
    assert.equal(servicioPermiteHorario(general, '10:00', 'jueves'), false);
    assert.equal(servicioPermiteHorario(general, '10:00'), false, 'sin dia tambien funciona (codigo viejo)');
}

// Solo horas por dia (el caso pedido): el miercoles solo 13:00 y 13:30; el resto de dias, libre
{
    const s = { horarios_permitidos: [], horarios_permitidos_por_dia: { miercoles: ['13:00', '13:30'] } };
    assert.equal(servicioRestringeHorarios(s, 'miercoles'), true);
    assert.equal(servicioPermiteHorario(s, '13:00', 'miercoles'), true);
    assert.equal(servicioPermiteHorario(s, '13:30', 'miercoles'), true);
    assert.equal(servicioPermiteHorario(s, '09:00', 'miercoles'), false, 'el miercoles solo esas horas');
    assert.equal(servicioRestringeHorarios(s, 'martes'), false, 'los otros dias no se restringen');
    assert.equal(servicioPermiteHorario(s, '09:00', 'martes'), true);
}

// Lista general + un dia propio: ese dia manda, los demas usan la general
{
    const s = { horarios_permitidos: ['09:00', '11:00'], horarios_permitidos_por_dia: { sabado: ['15:00'] } };
    assert.deepEqual([...horariosPermitidosDelDia(s, 'sabado')], ['15:00']);
    assert.equal(servicioPermiteHorario(s, '09:00', 'sabado'), false, 'el sabado la general NO se suma');
    assert.equal(servicioPermiteHorario(s, '15:00', 'sabado'), true);
    assert.deepEqual([...horariosPermitidosDelDia(s, 'lunes')], ['09:00', '11:00']);
    assert.equal(servicioPermiteHorario(s, '11:00', 'lunes'), true);
}

// Dia con lista vacia o dato raro: cae a la general, no rompe
{
    const s = { horarios_permitidos: ['09:00'], horarios_permitidos_por_dia: { lunes: [], martes: null, jueves: 'no-es-lista' } };
    assert.deepEqual([...horariosPermitidosDelDia(s, 'lunes')], ['09:00']);
    assert.deepEqual([...horariosPermitidosDelDia(s, 'martes')], ['09:00']);
    assert.deepEqual([...horariosPermitidosDelDia(s, 'jueves')], ['09:00']);
}

// Compatibilidad AM/PM de datos viejos: "1:30" tambien deja pasar "13:30" (variantesHorarioPermitido)
{
    const s = { horarios_permitidos_por_dia: { miercoles: ['01:30'] } };
    assert.equal(servicioPermiteHorario(s, '13:30', 'miercoles'), true);
    assert.equal(servicioPermiteHorario(s, '01:30', 'miercoles'), true);
}

// Dia apagado ("cerrado"): el servicio no ofrece ninguna hora ese dia, y los demas dias siguen igual
{
    const s = { horarios_permitidos: ['09:00', '11:00'], horarios_permitidos_por_dia: { lunes: 'cerrado', miercoles: ['13:00'] } };
    assert.equal(servicioCerradoEseDia(s, 'lunes'), true);
    assert.equal(servicioRestringeHorarios(s, 'lunes'), true, 'un dia cerrado cuenta como restringido (para que se aplique el filtro)');
    assert.equal(servicioPermiteHorario(s, '09:00', 'lunes'), false, 'ni siquiera las horas de la lista general');
    assert.equal(servicioPermiteHorario(s, '13:00', 'lunes'), false);
    assert.equal(servicioCerradoEseDia(s, 'martes'), false);
    assert.equal(servicioPermiteHorario(s, '09:00', 'martes'), true, 'otros dias: la lista general');
    assert.equal(servicioPermiteHorario(s, '13:00', 'miercoles'), true, 'un dia con horas propias no se ve afectado');
    assert.equal(servicioCerradoEseDia(s), false, 'sin dia no se cierra nada (codigo viejo)');
    // sin lista general: solo ese dia queda sin horas
    const solo = { horarios_permitidos_por_dia: { domingo: 'cerrado' } };
    assert.equal(servicioPermiteHorario(solo, '10:00', 'domingo'), false);
    assert.equal(servicioPermiteHorario(solo, '10:00', 'sabado'), true);
    // "cerrado" nunca se confunde con una lista de horas
    assert.deepEqual([...horariosPermitidosDelDia(s, 'lunes')], ['09:00', '11:00']);
}

console.log('OK: horarios del servicio por dia de la semana');
