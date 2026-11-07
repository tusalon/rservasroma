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
    const hace = (pro, servicio) => servicio !== 'B';
    assert.equal(c.elegirCandidata(combo, 670, esperan, hace).id, 14);
    assert.equal(c.elegirCandidata(combo, 650, esperan, hace).id, 15, 'con menos hueco, la siguiente que cabe');
    assert.equal(c.elegirCandidata(combo, 640, esperan.slice(0, 5), hace), null, 'nadie encaja');
    const tarde = juntos.find(h => h.ini === 900);
    assert.equal(c.elegirCandidata(tarde, 930, esperan, hace).id, 11, 'por la tarde va la de la tarde');
    assert.equal(c.elegirCandidata(combo, 670, [{ id: 20, profesional_id: null, franja: 'manana' }]).id, 20, 'sin duracion se asume 30 min');

    console.log('lista-espera-funcion: OK');
})().catch(e => { console.error(e); process.exit(1); });
