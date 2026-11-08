// Cuentas de la funcion lista-espera (supabase/functions/lista-espera/cuenta.mjs): juntar huecos,
// cuanto sigue libre y a quien se le ofrece.

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
    const c = await import(pathToFileURL(path.join(__dirname, '..', 'supabase', 'functions', 'lista-espera', 'cuenta.mjs')).href);

    // Un combo cancelado (10:30-10:50 y 10:50-11:10) es UN hueco de 40 min; otra profesional va aparte.
    const juntos = c.juntarHuecos([
        { id: 2, fecha: '2026-11-09', profesional_id: 581, hora_inicio: '10:50:00', hora_fin: '11:10:00', rechazado_por: [9] },
        { id: 1, fecha: '2026-11-09', profesional_id: 581, hora_inicio: '10:30:00', hora_fin: '10:50:00' },
        { id: 3, fecha: '2026-11-09', profesional_id: 517, hora_inicio: '10:30:00', hora_fin: '11:00:00' },
        { id: 4, fecha: '2026-11-09', profesional_id: 581, hora_inicio: '15:00:00', hora_fin: '15:30:00' },
    ]);
    assert.equal(juntos.length, 3);
    const combo = juntos.find(h => h.profesional_id === 581 && h.ini === 630);
    assert.deepEqual([combo.fin, combo.ids, combo.rechazado], [670, [1, 2], [9]], 'combo junto, con sus rechazos');

    // Cuanto sigue libre
    assert.equal(c.finLibre(combo, []), 670);
    assert.equal(c.finLibre(combo, [['10:00', '10:40']]), null, 'algo pisa el inicio: ya no esta libre');
    assert.equal(c.finLibre(combo, [['11:00', '11:30']]), 660, 'otra cita empieza dentro: se recorta');
    assert.equal(c.finLibre(combo, [['10:00', '10:30']]), 670, 'termina justo cuando empieza: libre');

    // A quien se le ofrece (la lista ya viene por orden de llegada)
    const esperan = [
        { id: 9, profesional_id: 581, franja: 'manana', duracion: 20, servicio: 'A' },     // ya lo rechazo
        { id: 10, profesional_id: 517, franja: 'manana', duracion: 20, servicio: 'A' },    // otra profesional
        { id: 11, profesional_id: null, franja: 'tarde', duracion: 20, servicio: 'A' },    // quiere tarde
        { id: 12, profesional_id: null, franja: 'cualquiera', duracion: 60, servicio: 'A' }, // no cabe (40 min)
        { id: 13, profesional_id: null, franja: 'manana', duracion: 30, servicio: 'B' },   // 581 no hace B
        { id: 14, profesional_id: 581, franja: 'cualquiera', duracion: 40, servicio: 'A' }, // esta
        { id: 15, profesional_id: null, franja: 'manana', duracion: 20, servicio: 'A' },
    ];
    // Servicios reales: A lo hace 581; B solo 517; C solo a las 9:30 y 10:30 (como la maderoterapia de Natali).
    const servicios = [
        { id: 1, nombre: 'A', horarios_permitidos: [] },
        { id: 2, nombre: 'B', horarios_permitidos: [] },
        { id: 3, nombre: 'C', horarios_permitidos: ['9:30', '10:30'] },
        { id: 4, nombre: 'D', horarios_permitidos: [], horarios_permitidos_por_dia: { lunes: 'cerrado' } },
    ];
    const asignaciones = [{ servicio_id: 1, profesional_id: 581 }, { servicio_id: 2, profesional_id: 517 }];
    const dia = c.diaDe('2026-11-09');
    assert.equal(dia, 'lunes');
    const hace = (e, ini) => c.encajaServicios(e, 581, ini, dia, servicios, asignaciones);
    assert.equal(c.elegirCandidata(combo, 670, esperan, hace).id, 14);
    assert.equal(c.elegirCandidata(combo, 650, esperan, hace).id, 15, 'con menos hueco, la siguiente que cabe');
    assert.equal(c.elegirCandidata(combo, 640, esperan.slice(0, 5), hace), null, 'nadie encaja');
    const tarde = juntos.find(h => h.ini === 900);
    assert.equal(c.elegirCandidata(tarde, 930, esperan, hace).id, 11, 'por la tarde va la de la tarde');
    assert.equal(c.elegirCandidata(combo, 670, [{ id: 20, profesional_id: null, franja: 'manana' }]).id, 20, 'sin duracion se asume 30 min');

    // Horas permitidas del servicio (la regla de la app: "3:00" vale tambien 15:00; "cerrado" ese dia)
    assert.equal(c.permiteHora(servicios[2], 630, dia), true, 'C a las 10:30 si');
    assert.equal(c.permiteHora(servicios[2], 650, dia), false, 'C a las 10:50 no');
    assert.equal(c.permiteHora({ horarios_permitidos: ['3:00'] }, 900, dia), true, '3:00 = 15:00');
    assert.equal(c.permiteHora(servicios[3], 630, 'lunes'), false, 'cerrado ese dia');
    assert.equal(c.permiteHora(servicios[3], 630, 'martes'), true);
    assert.equal(c.encajaServicios({ servicio: 'C', duracion: 20 }, 581, 650, dia, servicios, asignaciones), false, 'suelto fuera de su hora');

    // Combos: con UNA profesional se ofrecen enteros; cada servicio tiene que aceptar su hora en la cadena
    const comboUna = { id: 30, profesional_id: 581, franja: 'manana', duracion: 40, servicio: 'C + A',
        combo: [{ servicio: 'C', duracion: 20, profesional_id: 581 }, { servicio: 'A', duracion: 20, profesional_id: 581 }] };
    assert.equal(c.elegirCandidata(combo, 670, [comboUna], hace).id, 30, 'C a las 10:30 y luego A a las 10:50');
    const comboAlReves = { ...comboUna, id: 31, servicio: 'A + C', combo: [comboUna.combo[1], comboUna.combo[0]] };
    assert.equal(c.elegirCandidata(combo, 670, [comboAlReves], hace), null, 'C caeria a las 10:50: no se ofrece');
    const comboDos = { id: 32, profesional_id: null, franja: 'manana', duracion: 40, servicio: 'A + B',
        combo: [{ servicio: 'A', duracion: 20, profesional_id: 581 }, { servicio: 'B', duracion: 20, profesional_id: 517 }] };
    assert.equal(c.comboVariasProfesionales(comboDos), true);
    assert.equal(c.comboVariasProfesionales(comboUna), false);
    assert.equal(c.elegirCandidata(combo, 670, [comboDos], hace), null, 'combo con varias profesionales: lo gestiona la duena');
    assert.deepEqual(c.itemsDeEspera({ servicio: 'A', duracion: 20, profesional_id: 581 }), [{ servicio: 'A', duracion: 20, profesional_id: 581 }]);

    console.log('lista-espera-funcion: OK');
})().catch(e => { console.error(e); process.exit(1); });
