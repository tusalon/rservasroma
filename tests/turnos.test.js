// Turnos (utils/turnos.js): agrupar las filas de una visita, moverla entera, quitarle o anadirle un servicio
// y buscar huecos. Mas lo que hace con Supabase, con una Supabase simulada.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const t = require('../utils/turnos.js');

const fila = (id, ini, fin, servicio, extra = {}) => ({
    id, fecha: '2099-06-10', hora_inicio: ini, hora_fin: fin, servicio, duracion: undefined,
    cliente_nombre: 'Ana', cliente_whatsapp: '+5355500001', estado: 'Reservado', profesional_id: 1, profesional_nombre: 'Juana', ...extra
});

// --- Agrupar: filas seguidas de la misma clienta, dia y estado forman un turno
const turnos = t.agruparTurnos([
    fila(2, '10:30:00', '11:30:00', 'Pedicura', { profesional_id: 2, profesional_nombre: 'Roma' }),
    fila(1, '10:00:00', '10:30:00', 'Manicura'),
    fila(3, '14:00:00', '15:00:00', 'Corte'),
    fila(4, '10:00:00', '10:30:00', 'Manicura', { cliente_whatsapp: '+5355500002', cliente_nombre: 'Otra' }),
    fila(5, '11:30:00', '12:00:00', 'Cejas', { estado: 'Cancelado' })
]);
assert.equal(turnos.length, 4, 'Ana 10:00-11:30 junto, Ana 14:00, Otra, y la cancelada aparte');
const combo = turnos.find((x) => x.filas.length === 2);
assert.deepEqual(combo.filas.map((f) => f.id), [1, 2], 'en orden de hora');
assert.equal(combo.id, 1, 'el turno se llama como su primera fila');
assert.equal(combo.hora_inicio, '10:00:00');
assert.equal(combo.hora_fin, '11:30');
assert.equal(combo.duracion, 90);
assert.equal(combo.servicio, 'Manicura + Pedicura');
assert.equal(combo.profesional_nombre, 'Juana · Roma');
assert.deepEqual(combo.items.map((i) => i.nombre), ['Manicura', 'Pedicura']);
assert.equal(combo.items[1].filaId, 2);
assert.equal(t.agruparTurnos([fila(1, '10:00', '10:30', 'A'), fila(2, '10:45', '11:00', 'B')]).length, 2, 'con un hueco no se juntan');
assert.deepEqual(t.agruparTurnos(undefined), []);
assert.equal(t.agruparTurnos([fila(1, '10:00', '11:00', 'Axilas + Bikini')])[0].items.length, 2, 'varios servicios en una fila');
assert.equal(t.agruparTurnos([fila(1, '10:00', null, 'X', { duracion: 45 })])[0].hora_fin, '10:45', 'sin hora de fin usa la duracion');

// --- Mover el turno entero conserva las distancias y empieza por el lado correcto
const dos = [fila(1, '10:00', '10:30', 'Manicura'), fila(2, '10:30', '11:30', 'Pedicura')];
let plan = t.planMoverTurno(dos, '2099-06-10', '10:30');
assert.deepEqual(plan.map((c) => [c.id, c.hora_inicio, c.hora_fin]), [[2, '11:00', '12:00'], [1, '10:30', '11:00']],
    'hacia adelante en el mismo dia: la ultima fila primero (si no, chocaria con la otra)');
plan = t.planMoverTurno(dos, '2099-06-10', '09:30');
assert.deepEqual(plan.map((c) => [c.id, c.hora_inicio, c.hora_fin]), [[1, '09:30', '10:00'], [2, '10:00', '11:00']], 'hacia atras: la primera fila primero');
plan = t.planMoverTurno(dos, '2099-06-12', '16:00');
assert.deepEqual(plan.map((c) => [c.id, c.fecha, c.hora_inicio, c.hora_fin]), [[2, '2099-06-12', '16:30', '17:30'], [1, '2099-06-12', '16:00', '16:30']]);
assert.equal(plan[0].anterior.hora_inicio, '10:30', 'guarda como estaba cada fila para poder deshacer');

// --- Quitar un servicio
const juntos = t.agruparTurnos([fila(1, '10:00', '10:30', 'Manicura'), fila(2, '10:30', '11:30', 'Pedicura')])[0];
assert.equal(t.planQuitarServicio(juntos, juntos.items[1], {}).tipo, 'cancelarFila');
assert.equal(t.planQuitarServicio(juntos, juntos.items[1], {}).fila.id, 2);
const solo = t.agruparTurnos([fila(1, '10:00', '10:30', 'Manicura')])[0];
assert.equal(t.planQuitarServicio(solo, solo.items[0], {}).tipo, 'cancelarTurno', 'si es el unico servicio, es cancelar el turno');
const unidos = t.agruparTurnos([fila(1, '10:00', '11:30', 'Axilas + Bikini', { duracion: 90 })])[0];
const quitarBikini = t.planQuitarServicio(unidos, unidos.items[1], { bikini: 30 });
assert.deepEqual([quitarBikini.tipo, quitarBikini.servicio, quitarBikini.duracion, quitarBikini.hora_fin], ['editarFila', 'Axilas', 60, '11:00']);
assert.equal(t.planQuitarServicio(unidos, unidos.items[1], {}).motivo, 'sin_duracion', 'sin saber cuanto dura no inventa');

// --- Disponibilidad
const ctx = (extra = {}) => ({ trabaja: true, slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'], descansos: [], ocupadas: [], ...extra });
assert.equal(t.cabeEnProfesional(ctx(), 540, 600, { exigirSlot: true }), true);
assert.equal(t.cabeEnProfesional(ctx({ trabaja: false }), 540, 600), false, 'no trabaja ese dia');
assert.equal(t.cabeEnProfesional(ctx(), 541, 600, { exigirSlot: true }), false, 'el inicio tiene que ser un horario suyo');
assert.equal(t.cabeEnProfesional(ctx({ descansos: [{ inicio: '09:30', fin: '10:00' }] }), 540, 600), false, 'cruza un descanso');
assert.equal(t.cabeEnProfesional(ctx({ ocupadas: [{ id: 7, hora_inicio: '09:30', hora_fin: '10:30' }] }), 540, 600), false, 'choca con otra cita');
assert.equal(t.cabeEnProfesional(ctx({ ocupadas: [{ id: 7, hora_inicio: '09:30', hora_fin: '10:30' }] }), 540, 600, { ignorar: new Set(['7']) }), true, 'una cita que se esta moviendo no estorba');
assert.equal(t.cabeEnProfesional(ctx({ ocupadas: [{ id: 7, hora_inicio: '10:00', hora_fin: '11:00' }] }), 540, 600), true, 'pegada no choca');
assert.equal(t.cabeEnProfesional(ctx({ slots: ['23:30'] }), 23 * 60 + 30, 24 * 60 + 30), false, 'no pasa de medianoche');

// Turno de dos filas con profesionales distintas: Juana 30 min y luego Roma 60 min
const filasTurno = [{ profesionalId: 1, offset: 0, dur: 30 }, { profesionalId: 2, offset: 30, dur: 60 }];
const contextos = {
    1: ctx(),
    2: ctx({ ocupadas: [{ id: 50, hora_inicio: '10:30', hora_fin: '11:00' }, { id: 77, hora_inicio: '09:30', hora_fin: '10:00' }] })
};
assert.deepEqual(t.horasLibresTurno({ filas: filasTurno, contextos, ignorarIds: [] }), ['10:30', '11:00', '11:30', '12:00'],
    'la segunda fila de Roma (60 min, 30 despues) tiene que caber en su sitio');
assert.deepEqual(t.horasLibresTurno({ filas: filasTurno, contextos, ignorarIds: [50] }), ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    'si la cita de Roma es del propio turno, ya no estorba');
assert.deepEqual(t.horasLibresTurno({ filas: filasTurno, contextos, permiteInicio: (h) => h >= '12:00' }), ['12:00'],
    'el limite de antelacion y de horarios del servicio se aplica al inicio');
assert.deepEqual(t.horasLibresTurno({ filas: [], contextos }), []);
assert.deepEqual(t.huecosParaServicio({ contexto: ctx({ ocupadas: [{ id: 1, hora_inicio: '10:00', hora_fin: '11:00' }] }), dur: 60 }),
    ['09:00', '11:00', '11:30', '12:00'], 'cada hora de inicio donde cabe una hora');

// --- Sugerencias: justo despues, mismo dia cerca, otros dias
const cand = (fecha, hora, prof = 1) => ({ fecha, hora_inicio: hora, profesional_id: prof });
const sugeridas = t.clasificarSugerencias([
    cand('2099-06-11', '09:00'), cand('2099-06-11', '09:30'), cand('2099-06-11', '10:00'), cand('2099-06-11', '10:30'), cand('2099-06-12', '09:00'),
    cand('2099-06-10', '09:00'), cand('2099-06-10', '12:00'), cand('2099-06-10', '11:30', 2), cand('2099-06-10', '11:30', 1), cand('2099-06-09', '09:00')
], { fecha: '2099-06-10', finMin: 11 * 60 + 30, profesionalPreferidaId: 1 });
assert.deepEqual(sugeridas.slice(0, 2).map((s) => [s.tipo, s.profesional_id]), [['contigua', 1], ['contigua', 2]], 'primero justo despues, con la profesional de la cita primero');
assert.equal(sugeridas[2].tipo, 'mismo_dia');
assert.equal(sugeridas[2].hora_inicio, '12:00', 'el mismo dia, lo mas cerca posible');
assert.ok(sugeridas.every((s) => s.fecha >= '2099-06-10'), 'nunca un dia anterior a la cita');
assert.equal(sugeridas.filter((s) => s.fecha === '2099-06-11').length, 3, 'maximo 3 horas por cada otro dia');
assert.deepEqual(sugeridas.filter((s) => s.tipo === 'otro_dia').map((s) => s.fecha + s.hora_inicio),
    ['2099-06-1109:00', '2099-06-1109:30', '2099-06-1110:00', '2099-06-1209:00'], 'otros dias en orden');
assert.equal(t.clasificarSugerencias(Array.from({ length: 80 }, (_, i) => cand(`2099-07-${String(1 + (i % 28)).padStart(2, '0')}`, '09:00', i)), { fecha: '2099-06-10', finMin: 600 }).length <= 12, true, 'tope de sugerencias');

// ==================================================================================================
// Con una Supabase simulada
// ==================================================================================================
function pantalla({ reservas = [], profesionales = [{ id: 1, nombre: 'Juana', fechas_libres: [] }], falla = () => false, servicios = [], porServicio = {} } = {}) {
    const llamadas = [];
    const ventana = {
        SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k', getNegocioId: () => 'N1', console: { ...console, warn() {}, error() {} },
        salonConfig: {
            get: async () => ({ max_antelacion_dias: 0, min_antelacion_horas: 0 }),
            getHorariosProfesionalParaFechas: async (profId, fechas) => Object.fromEntries(fechas.map((f) => [f, {
                horariosPorDia: Object.fromEntries(['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].map((d) => [d, [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34]])),
                descansosPorDia: {}
            }]))
        },
        getDiasCerrados: async () => [],
        salonServicios: { getAll: async () => servicios },
        getProfesionalesPorServicio: async (id) => porServicio[id] || [],
        notificarListaEsperaTurnoLiberado: async (f) => { llamadas.push({ metodo: 'LISTA_ESPERA', cuerpo: f.id }); },
        fetch: async (url, opts = {}) => {
            const metodo = opts.method || 'GET';
            const cuerpo = opts.body ? JSON.parse(opts.body) : null;
            llamadas.push({ url: String(url), metodo, cuerpo });
            if (metodo === 'GET' && url.includes('/profesionales')) return { ok: true, status: 200, json: async () => profesionales, text: async () => '' };
            if (metodo === 'GET' && url.includes('/reservas')) return { ok: true, status: 200, json: async () => reservas, text: async () => '' };
            const motivo = falla(metodo, url, cuerpo, llamadas);
            if (motivo) return { ok: false, status: motivo, json: async () => ({}), text: async () => (motivo === 409 ? '{"code":"23P01"}' : 'error') };
            return { ok: true, status: 200, json: async () => [{ id: Number(String(url).split('id=eq.')[1]) || 99, ...(cuerpo || {}) }], text: async () => '' };
        }
    };
    ventana.window = ventana;
    vm.createContext(ventana);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../utils/turnos.js'), 'utf8'), ventana);
    return { w: ventana.turnos, llamadas };
}
const patches = (llamadas) => llamadas.filter((l) => l.metodo === 'PATCH');

(async () => {
    const turno = t.agruparTurnos([fila(1, '10:00:00', '10:30:00', 'Manicura'), fila(2, '10:30:00', '11:30:00', 'Pedicura')])[0];

    // --- Horas libres para mover el turno: sus propias filas no estorban
    let p = pantalla({ reservas: [{ id: 60, fecha: '2099-06-11', hora_inicio: '09:00', hora_fin: '10:00' }, { id: 61, fecha: '2099-06-11', hora_inicio: '12:00', hora_fin: '12:30' }] });
    let r = await p.w.horasLibresParaTurno(turno, '2099-06-11');
    assert.deepEqual([...r.horas].filter((h) => h <= '12:00'), ['10:00', '10:30'], 'el turno dura 90 min en dos filas: solo caben entre las dos citas de otras');
    p = pantalla({ reservas: [{ id: 1, fecha: '2099-06-10', hora_inicio: '10:00', hora_fin: '10:30' }, { id: 2, fecha: '2099-06-10', hora_inicio: '10:30', hora_fin: '11:30' }] });
    r = await p.w.horasLibresParaTurno(turno, '2099-06-10');
    assert.ok(r.horas.includes('10:00'), 'las filas del propio turno se ignoran: se puede dejar en su sitio o moverlo un poco');
    assert.ok(r.horas.includes('10:30'), 'moverlo media hora no choca consigo mismo');
    assert.equal((await p.w.horasLibresParaTurno(turno, '2000-01-01')).horas.length, 0, 'fechas pasadas no tienen horas');
    p = pantalla({ profesionales: [{ id: 1, nombre: 'Juana', fechas_libres: ['2099-06-13'] }] });
    r = await p.w.horasLibresParaTurno(turno, '2099-06-13');
    assert.equal(r.horas.length, 0);
    assert.ok(r.mensaje.includes('libre'), 'si la profesional tiene libre ese dia lo dice');
    assert.equal((await p.w.horasLibresParaTurno(turno, '2099-06-13', { esAdmin: true })).horas.length > 0, true, 'la duena puede igualmente');

    // --- Mover el turno entero
    p = pantalla();
    let filas = await p.w.moverTurno(turno, '2099-06-12', '15:00');
    assert.deepEqual(patches(p.llamadas).map((l) => [l.cuerpo.fecha, l.cuerpo.hora_inicio, l.cuerpo.hora_fin]),
        [['2099-06-12', '15:30', '16:30'], ['2099-06-12', '15:00', '15:30']], 'primero la ultima fila');
    assert.ok(patches(p.llamadas).every((l) => l.cuerpo.push_recordatorio_dia_enviado === false && l.cuerpo.push_recordatorio_hora_enviado === false && l.cuerpo.recordatorio_1h_enviado === false),
        'al mover, los recordatorios vuelven a quedar pendientes');
    assert.equal(p.llamadas.filter((l) => l.metodo === 'LISTA_ESPERA').length, 2, 'avisa a la lista de espera de los dos horarios viejos');
    assert.equal(filas.length, 2);

    // Si la segunda fila falla, la primera vuelve a su sitio
    p = pantalla({ falla: (metodo, url, cuerpo, llamadas) => metodo === 'PATCH' && patches(llamadas).length === 2 && 409 });
    await assert.rejects(() => p.w.moverTurno(turno, '2099-06-12', '15:00'), (e) => e.code === 'HORARIO_OCUPADO');
    const enviados = patches(p.llamadas);
    assert.equal(enviados.length, 3, 'dos intentos y una marcha atras');
    assert.deepEqual([enviados[2].cuerpo.fecha, enviados[2].cuerpo.hora_inicio], ['2099-06-10', '10:30:00'], 'la fila que se habia movido (la segunda) vuelve a como estaba');
    assert.equal(p.llamadas.filter((l) => l.metodo === 'LISTA_ESPERA').length, 0, 'si no se movio, no se avisa a nadie');

    // Los avisos de recordatorio viven en otro SQL: si las columnas no existen, se guarda igual
    p = pantalla({ falla: (metodo, url, cuerpo) => metodo === 'PATCH' && 'push_recordatorio_dia_enviado' in cuerpo && 400 });
    await p.w.moverTurno(solo, '2099-06-12', '15:00');
    assert.equal(patches(p.llamadas).length, 2, 'primero con avisos, luego sin ellos');
    assert.ok(!('push_recordatorio_dia_enviado' in patches(p.llamadas)[1].cuerpo));

    // --- Quitar un servicio
    p = pantalla({ servicios: [{ nombre: 'Manicura', duracion: 30 }, { nombre: 'Pedicura', duracion: 60 }] });
    let plan2 = await p.w.quitarServicio(turno, turno.items[1]);
    assert.equal(plan2.tipo, 'cancelarFila');
    assert.deepEqual(patches(p.llamadas).map((l) => l.cuerpo.estado), ['Cancelado']);
    assert.equal(p.llamadas.filter((l) => l.metodo === 'LISTA_ESPERA').length, 1);
    p = pantalla();
    assert.equal((await p.w.quitarServicio(solo, solo.items[0])).tipo, 'cancelarTurno');
    assert.equal(patches(p.llamadas).length, 1);
    p = pantalla({ servicios: [{ nombre: 'Axilas', duracion: 60 }, { nombre: 'Bikini', duracion: 30 }] });
    const dosEnUno = t.agruparTurnos([fila(1, '10:00', '10:30', 'Corte'), fila(5, '10:30', '12:00', 'Axilas + Bikini')])[0];
    plan2 = await p.w.quitarServicio(dosEnUno, dosEnUno.items[2]);
    assert.deepEqual([plan2.tipo, plan2.servicio, plan2.duracion], ['editarFila', 'Axilas', 60]);
    assert.deepEqual([patches(p.llamadas)[0].cuerpo.servicio, patches(p.llamadas)[0].cuerpo.hora_fin], ['Axilas', '11:30']);
    p = pantalla({ servicios: [] });
    await assert.rejects(() => p.w.quitarServicio(dosEnUno, dosEnUno.items[2]), (e) => e.code === 'NO_SE_PUEDE_QUITAR');

    // --- Anadir un servicio
    const servicioNuevo = { id: 9, nombre: 'Cejas', duracion: 30 };
    p = pantalla();
    const creada = await p.w.anadirServicio(turno, servicioNuevo, { fecha: '2099-06-10', hora_inicio: '11:30', profesional_id: 2, profesional_nombre: 'Roma' });
    const post = p.llamadas.find((l) => l.metodo === 'POST').cuerpo;
    assert.deepEqual([post.servicio, post.duracion, post.hora_fin, post.profesional_id, post.estado, post.cliente_whatsapp, post.negocio_id],
        ['Cejas', 30, '12:00', 2, 'Reservado', '+5355500001', 'N1'], 'la fila nueva sale con los datos de la clienta y el estado del turno');
    assert.equal(creada.servicio, 'Cejas');
    const pendiente = t.agruparTurnos([fila(1, '10:00', '10:30', 'Manicura', { estado: 'Pendiente' })])[0];
    await p.w.anadirServicio(pendiente, servicioNuevo, { fecha: '2099-06-10', hora_inicio: '11:30', profesional_id: 2, profesional_nombre: 'Roma' });
    assert.equal(p.llamadas.filter((l) => l.metodo === 'POST')[1].cuerpo.estado, 'Pendiente', 'si el turno esta pendiente del anticipo, el servicio nuevo tambien (no se pide otro)');
    p = pantalla({ falla: (metodo) => metodo === 'POST' && 409 });
    await assert.rejects(() => p.w.anadirServicio(turno, servicioNuevo, { fecha: '2099-06-10', hora_inicio: '11:30', profesional_id: 2 }), (e) => e.code === 'HORARIO_OCUPADO');

    // --- Sugerencias para el servicio que se anade
    p = pantalla({
        profesionales: [{ id: 1, nombre: 'Juana', fechas_libres: [] }],
        porServicio: { 9: [{ id: 1, nombre: 'Juana', activo: true, fechas_libres: [] }] },
        reservas: [{ id: 1, fecha: '2099-06-10', hora_inicio: '10:00', hora_fin: '10:30' }, { id: 2, fecha: '2099-06-10', hora_inicio: '10:30', hora_fin: '11:30' }]
    });
    let sug = await p.w.sugerirParaServicio(turno, servicioNuevo);
    assert.equal(sug.sugerencias[0].tipo, 'contigua', 'lo primero que se ofrece es justo despues de la cita');
    assert.equal(sug.sugerencias[0].hora_inicio, '11:30');
    assert.equal(sug.sugerencias[0].hora_fin, '12:00');
    assert.ok(sug.sugerencias.some((s) => s.tipo === 'otro_dia'), 'tambien otros dias');
    assert.ok(!sug.sugerencias.some((s) => s.fecha === '2099-06-10' && s.hora_inicio >= '10:00' && s.hora_inicio < '11:30'), 'nada que pise la propia cita');

    // Si justo despues no hay sitio, ofrece otros horarios del mismo dia y otros dias
    p = pantalla({
        porServicio: { 9: [{ id: 1, nombre: 'Juana', activo: true, fechas_libres: [] }] },
        reservas: [{ id: 1, fecha: '2099-06-10', hora_inicio: '10:00', hora_fin: '10:30' }, { id: 2, fecha: '2099-06-10', hora_inicio: '10:30', hora_fin: '11:30' }, { id: 3, fecha: '2099-06-10', hora_inicio: '11:30', hora_fin: '12:30' }]
    });
    sug = await p.w.sugerirParaServicio(turno, servicioNuevo);
    assert.ok(!sug.sugerencias.some((s) => s.tipo === 'contigua'), 'ya no hay sitio justo despues');
    assert.equal(sug.sugerencias[0].tipo, 'mismo_dia');
    assert.ok(sug.sugerencias.length > 1);

    p = pantalla({ porServicio: {} });
    sug = await p.w.sugerirParaServicio(turno, servicioNuevo);
    assert.equal(sug.sugerencias.length, 0, 'sin profesionales para el servicio no hay nada que sugerir');
    assert.ok(sug.mensaje.length > 0);

    // --- Que todo este conectado: las dos apps cargan el motor y la pantalla de anadir; el panel y la clienta lo usan
    const leer = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    ['index.html', 'admin.html', 'sw.js'].forEach((archivo) => {
        const texto = leer(archivo);
        assert.ok(texto.includes('utils/turnos.js'), `${archivo} carga utils/turnos.js`);
        assert.ok(texto.includes('components/AnadirServicioTurno.js'), `${archivo} carga la pantalla de anadir servicio`);
    });
    const misReservas = leer('components/MyBookings.js');
    ['window.turnos.agruparTurnos', 'window.turnos.moverTurno', 'window.turnos.quitarServicio', '<AnadirServicioTurno'].forEach((uso) => {
        assert.ok(misReservas.includes(uso), `MyBookings usa ${uso}`);
    });
    assert.ok(!/estado === 'Cancelado' \? 'Reservado'/.test(misReservas), 'la clienta ya no reactiva una cita cancelada saltandose el anticipo');
    const panel = leer('admin-app.js');
    ['window.turnos.moverTurno', 'window.turnos.quitarServicio', 'window.turnos.patchFila', '<AnadirServicioTurno', 'turnoEditando'].forEach((uso) => {
        assert.ok(panel.includes(uso), `el panel usa ${uso}`);
    });
    assert.ok(/servicio: e\.target\.value, fecha: '', hora_inicio: '', hora_fin: '', duracion_personalizada: ''/.test(panel), 'al cambiar de servicio la duracion la manda el servicio nuevo');
    const interfaz = leer('components/AnadirServicioTurno.js');
    assert.ok(interfaz.includes('window.turnos.anadirServicio') && interfaz.includes('window.turnos.sugerirParaServicio'));

    console.log('turnos: ok');
})().catch((e) => { console.error(e); process.exit(1); });

