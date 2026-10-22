// Espacios del salon (utils/espacios.js): cuando todos los espacios de una profesional estan
// tomados por otras citas, ese tramo se bloquea. Caso base: Juana {1,2}, Roma {2,3}, Sofia {1,2,3}.

const assert = require('node:assert/strict');
const e = require('../utils/espacios.js');

const JUANA = 1, ROMA = 2, SOFIA = 3;
const cita = (profesional_id, espacio, ini, fin, fecha = '2026-10-21') =>
    ({ fecha, hora_inicio: ini, hora_fin: fin, profesional_id, espacio });

// --- Configuracion y espacios validos
assert.equal(e.estaActivo({ espacios_activos: true, espacios_cantidad: 3 }), true);
assert.equal(e.estaActivo({ espacios_activos: true, espacios_cantidad: 0 }), false, 'activo sin espacios no cuenta');
assert.equal(e.estaActivo({ espacios_activos: false, espacios_cantidad: 3 }), false);
assert.equal(e.estaActivo(null), false);
assert.deepEqual(e.espaciosDe({ espacios: [3, 1, 1, 9, 0, '2'] }, 3), [1, 2, 3], 'sin repetidos, fuera de rango ni desordenados');
assert.deepEqual(e.espaciosDe({}, 3), []);

// --- El caso del salon: Roma en el 2 y Sofia en el 1 a las 10 -> Juana {1,2} no puede
const salon = [cita(ROMA, 2, '10:00', '11:00'), cita(SOFIA, 1, '10:00', '11:00')];
const juana = e.bloqueosPorEspacios(JUANA, [1, 2], salon);
assert.equal(juana.length, 1, 'Juana queda bloqueada');
assert.equal(juana[0].hora_inicio, '10:00:00');
assert.equal(juana[0].hora_fin, '11:00:00');
assert.equal(juana[0].fecha, '2026-10-21');
assert.equal(juana[0].bloqueo_espacios, true);
assert.equal(juana[0].id, null, 'una cita virtual no tiene id');

// Roma {2,3}: Sofia ocupa el 1 (que Roma no usa) y su propia cita no cuenta -> libre
assert.deepEqual(e.bloqueosPorEspacios(ROMA, [2, 3], salon), [], 'a Roma le queda el 3');
// Sofia {1,2,3}: Roma en el 2 y la suya propia no cuenta -> quedan 1 y 3
assert.deepEqual(e.bloqueosPorEspacios(SOFIA, [1, 2, 3], salon), [], 'a Sofia le quedan el 1 y el 3');

// --- Se libera al cancelar (la cita cancelada ya no llega en la lista)
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], [cita(SOFIA, 1, '10:00', '11:00')]), [], 'queda libre el 2');

// --- Solape parcial y tramos contiguos
const escalonado = [cita(ROMA, 2, '10:00', '11:00'), cita(SOFIA, 1, '10:30', '11:30')];
const parcial = e.bloqueosPorEspacios(JUANA, [1, 2], escalonado);
assert.equal(parcial.length, 1, 'solo bloquea donde coinciden los dos');
assert.equal(parcial[0].hora_inicio, '10:30:00');
assert.equal(parcial[0].hora_fin, '11:00:00');

const seguidas = [cita(ROMA, 2, '10:00', '11:00'), cita(SOFIA, 1, '10:00', '11:00'),
    cita(ROMA, 2, '11:00', '12:00'), cita(SOFIA, 1, '11:00', '12:00')];
const unida = e.bloqueosPorEspacios(JUANA, [1, 2], seguidas);
assert.equal(unida.length, 1, 'dos tramos pegados se unen en uno');
assert.equal(unida[0].hora_inicio, '10:00:00');
assert.equal(unida[0].hora_fin, '12:00:00');

// --- Dias distintos no se mezclan
const dosDias = [cita(ROMA, 2, '10:00', '11:00', '2026-10-21'), cita(SOFIA, 1, '10:00', '11:00', '2026-10-22')];
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], dosDias), [], 'cada dia por separado');

// --- Sin espacios o citas sin espacio: no bloquea nada
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [], salon), [], 'profesional sin espacios: sin restriccion');
assert.deepEqual(e.bloqueosPorEspacios(JUANA, undefined, salon), []);
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], [cita(ROMA, null, '10:00', '11:00'), cita(SOFIA, null, '10:00', '11:00')]),
    [], 'las citas sin espacio no ocupan ninguno');
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], []), []);
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], [cita(ROMA, 2, '10:00', '10:00'), cita(SOFIA, 1, '10:00', '10:00')]),
    [], 'una cita sin duracion no ocupa nada');

// --- Un espacio que Juana no usa no la bloquea
assert.deepEqual(e.bloqueosPorEspacios(JUANA, [1, 2], [cita(ROMA, 3, '10:00', '11:00'), cita(SOFIA, 1, '10:00', '11:00')]),
    [], 'el 3 no es de Juana');


// --- Espacios por servicio: la cita usa solo los espacios de la profesional Y del servicio
assert.deepEqual(e.nombresDeServicio('Corte + Barba'), ['corte', 'barba'], 'varios servicios en una cita');
assert.deepEqual(e.nombresDeServicio('  PEDICURA '), ['pedicura'], 'sin mayusculas ni espacios');
assert.deepEqual(e.nombresDeServicio({ nombre: 'Manicura' }), ['manicura'], 'acepta un servicio');
assert.deepEqual(e.nombresDeServicio([{ nombre: 'Axilas' }, 'Bikini + Cejas']), ['axilas', 'bikini', 'cejas'], 'acepta una lista');
assert.deepEqual(e.nombresDeServicio(undefined), []);
assert.deepEqual(e.nombresDeServicio(null), []);

const porNombre = { manicura: [1, 2], pedicura: [3], axilas: [1, 2], bikini: [2, 3] };
assert.deepEqual(e.espaciosDelServicio('Manicura', porNombre), [1, 2]);
assert.equal(e.espaciosDelServicio('Corte', porNombre), null, 'un servicio sin espacios no restringe');
assert.deepEqual(e.espaciosDelServicio('Axilas + Bikini', porNombre), [2], 'varios: los espacios comunes');
assert.equal(e.espaciosDelServicio('Manicura + Pedicura', porNombre), null, 'sin espacios comunes no se bloquea el combo');
assert.deepEqual(e.espaciosDelServicio('Pedicura + Corte', porNombre), [3], 'un servicio sin espacios no estorba al otro');
assert.equal(e.espaciosDelServicio(undefined, porNombre), null);
assert.equal(e.espaciosDelServicio('Manicura', undefined), null);

assert.equal(e.espaciosPermitidos([], []), null, 'ni la profesional ni el servicio tienen espacios: sin restriccion');
assert.equal(e.espaciosPermitidos(undefined, null), null);
assert.deepEqual(e.espaciosPermitidos([1, 2], null), [1, 2], 'solo la profesional');
assert.deepEqual(e.espaciosPermitidos([], [3]), [3], 'profesional sin espacios: manda el servicio');
assert.deepEqual(e.espaciosPermitidos([2, 3], [1, 2]), [2], 'los comunes');
assert.deepEqual(e.espaciosPermitidos([1, 2], [3]), [], 'nada en comun: esa profesional no hace ese servicio');

const diaCompleto = e.bloqueosDiaCompleto(7, '2026-10-30', '2026-11-01');
assert.deepEqual(diaCompleto.map(b => b.fecha), ['2026-10-30', '2026-10-31', '2026-11-01'], 'un bloqueo por dia, tambien al cambiar de mes');
assert.equal(diaCompleto[0].hora_inicio, '00:00:00');
assert.equal(diaCompleto[0].hora_fin, '23:59:00');
assert.equal(diaCompleto[0].bloqueo_espacios, true);
assert.equal(e.bloqueosDiaCompleto(7, '2026-10-30').length, 1, 'sin fecha final es solo ese dia');
assert.equal(e.bloqueosDiaCompleto(7, '2026-01-01', '2026-12-31').length, 62, 'tope de 62 dias');

// El caso del salon con servicios: la Pedicura solo en el espacio 3
// Roma {2,3} hace Pedicura en el 3; Sofia {1,2,3} tambien (3); Juana {1,2} no comparte espacio
const soloPedicura = e.espaciosPermitidos([2, 3], [3]);
assert.deepEqual(e.bloqueosPorEspacios(SOFIA, e.espaciosPermitidos([1, 2, 3], [3]), [cita(ROMA, 3, '12:00', '13:00')]).map(b => b.hora_inicio),
    ['12:00:00'], 'Pedicura: con el 3 ocupado por Roma, Sofia no puede');
assert.deepEqual(e.bloqueosPorEspacios(SOFIA, e.espaciosPermitidos([1, 2, 3], [1, 2]), [cita(ROMA, 3, '12:00', '13:00')]), [],
    'Manicura {1,2}: a Sofia no le afecta que el 3 este ocupado');
assert.deepEqual(soloPedicura, [3]);

// --- Lo que ve la pantalla, con una Supabase simulada
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function pantalla(respuestas) {
    const llamadas = [];
    const ventana = {
        SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k', getNegocioId: () => 'N1',
        fetch: async (url, opts) => {
            llamadas.push({ url: String(url), metodo: (opts && opts.method) || 'GET', cuerpo: opts && opts.body });
            const r = respuestas(String(url), opts || {});
            return { ok: r.ok !== false, status: r.status || 200, json: async () => r.json, text: async () => JSON.stringify(r.json) };
        },
        console: { ...console, warn() {} } // el aviso de "sin red" es esperado en la prueba
    };
    ventana.window = ventana;
    vm.createContext(ventana);
    const codigo = fs.readFileSync(path.join(__dirname, '../utils/espacios.js'), 'utf8');
    vm.runInContext(codigo, ventana);
    return { w: ventana.espacios, llamadas };
}
const propias = [{ id: 7, fecha: '2026-10-21', hora_inicio: '09:00', hora_fin: '10:00' }];

(async () => {
    // Funcion activa: suma el tramo bloqueado a las citas de Juana
    let p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 3 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 1, espacios: [1, 2] }, { id: 2, espacios: [2, 3] }, { id: 3, espacios: [1, 2, 3] }] };
        if (url.includes('/servicios')) return { json: [] };
        if (url.includes('/reservas')) return { json: [cita(ROMA, 2, '10:00', '11:00'), cita(SOFIA, 1, '10:00', '11:00')] };
        throw new Error('url inesperada ' + url);
    });
    let todas = await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias);
    assert.equal(todas.length, 2, 'su cita mas el tramo bloqueado');
    assert.equal(todas[0], propias[0], 'conserva sus citas');
    assert.equal(todas[1].hora_inicio, '10:00:00');
    assert.equal(todas[1].bloqueo_espacios, true);
    // Para Roma queda libre: no se agrega nada
    assert.equal((await p.w.reservasConEspacios(2, '2026-10-21', '2026-10-21', propias)).length, 1);
    // Las lecturas son del salon actual y no de cualquiera
    assert.ok(p.llamadas.every(l => l.url.includes('negocio_id=eq.N1')), 'siempre filtra por el negocio');
    assert.ok(p.llamadas.every(l => l.metodo === 'GET'), 'solo lee');

    // Funcion apagada: devuelve lo mismo y no pide las citas del salon
    p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: false, espacios_cantidad: 3 }] };
        throw new Error('no debia consultar ' + url);
    });
    assert.equal(await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias), propias, 'apagado: tal cual');

    // El SQL aun no se corrio (las columnas no existen -> 400): se comporta como sin espacios
    p = pantalla(() => ({ ok: false, status: 400, json: { code: '42703' } }));
    assert.equal(await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias), propias, 'sin SQL: tal cual');

    // Falla la red: no rompe la reserva
    p = pantalla(() => { throw new Error('sin red'); });
    assert.equal(await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias), propias, 'sin red: tal cual');

    // Una profesional sin espacios marcados no tiene restriccion y no se piden las citas del salon
    p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 3 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 1, espacios: [] }] };
        if (url.includes('/servicios')) return { json: [] };
        throw new Error('no debia consultar ' + url);
    });
    assert.equal(await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias), propias, 'sin espacios marcados');

    // Reprogramar: su propia cita no la bloquea
    p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 2 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 1, espacios: [1, 2] }, { id: 2, espacios: [1, 2] }] };
        if (url.includes('/servicios')) return { json: [] };
        return { json: [{ id: 50, fecha: '2026-10-21', hora_inicio: '10:00', hora_fin: '11:00', profesional_id: 2, espacio: 1 },
                        { id: 51, fecha: '2026-10-21', hora_inicio: '10:00', hora_fin: '11:00', profesional_id: 3, espacio: 2 }] };
    });
    assert.equal((await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', [], 50)).length, 0, 'la cita que se mueve libera su espacio');
    assert.equal((await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', [])).length, 1, 'sin excluirla, bloquea');

    // Reparto al activar: llama a la funcion de la base con el negocio
    p = pantalla((url) => ({ json: [{ id: 9, fecha: '2026-11-02', hora_inicio: '10:00:00', cliente_nombre: 'Ana' }] }));
    const rep = await p.w.asignarCitasFuturas();
    assert.equal(rep.sinCupo.length, 1);
    assert.ok(p.llamadas[0].url.endsWith('/rpc/asignar_espacios_futuros'));
    assert.equal(JSON.parse(p.llamadas[0].cuerpo).p_negocio, 'N1');

    // --- Espacios por servicio, con la Supabase simulada
    const supabaseConServicios = (servicios) => pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 3 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 1, espacios: [1, 2] }, { id: 2, espacios: [2, 3] }, { id: 3, espacios: [1, 2, 3] }, { id: 4, espacios: [] }] };
        if (url.includes('/servicios')) return { json: servicios };
        if (url.includes('/reservas')) return { json: [cita(ROMA, 3, '12:00', '13:00'), cita(SOFIA, 1, '14:00', '15:00')] };
        throw new Error('url inesperada ' + url);
    });
    const servicios = [
        { nombre: 'Manicura', espacios: [1, 2] },
        { nombre: 'Pedicura', espacios: [3] },
        { nombre: 'Corte', espacios: [] },
        { nombre: 'Axilas', espacios: [1, 2] },
        { nombre: 'Bikini', espacios: [2, 3] }
    ];

    p = supabaseConServicios(servicios);
    // Pedicura solo en el 3: Juana {1,2} no comparte espacio -> no puede hacerla nunca (dia completo)
    let r = await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-22', [], null, 'Pedicura');
    assert.equal(r.length, 2, 'un bloqueo por cada dia pedido');
    assert.ok(r.every(b => b.hora_inicio === '00:00:00' && b.hora_fin === '23:59:00' && b.bloqueo_espacios));
    // Sofia {1,2,3}: Pedicura solo en el 3 y Roma lo tiene de 12 a 13
    r = await p.w.reservasConEspacios(3, '2026-10-21', '2026-10-21', [], null, { nombre: 'Pedicura' });
    assert.deepEqual(r.map(b => `${b.hora_inicio}-${b.hora_fin}`), ['12:00:00-13:00:00'], 'se bloquea cuando el 3 esta ocupado');
    // Sofia con una Manicura {1,2}: el 1 esta ocupado de 14 a 15 pero el 2 esta libre
    assert.equal((await p.w.reservasConEspacios(3, '2026-10-21', '2026-10-21', [], null, 'Manicura')).length, 0, 'queda el 2');
    // Un servicio sin espacios marcados: solo cuentan los de la profesional (Roma {2,3}: el 3 ocupado, el 2 libre)
    assert.equal((await p.w.reservasConEspacios(2, '2026-10-21', '2026-10-21', [], null, 'Corte')).length, 0);
    // Servicio que no existe o no se indica: como antes (solo la profesional)
    assert.equal((await p.w.reservasConEspacios(2, '2026-10-21', '2026-10-21', [], null)).length, 0);
    assert.equal((await p.w.reservasConEspacios(2, '2026-10-21', '2026-10-21', [], null, 'Algo que no existe')).length, 0);
    // Profesional sin espacios y servicio con espacios: manda el servicio (Pedicura {3}, ocupado 12-13 por Roma)
    r = await p.w.reservasConEspacios(4, '2026-10-21', '2026-10-21', [], null, 'Pedicura');
    assert.deepEqual(r.map(b => b.hora_inicio), ['12:00:00'], 'sin espacios propios, mandan los del servicio');
    // Profesional sin espacios y servicio sin espacios: no se toca nada ni se piden las citas
    p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 3 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 4, espacios: [] }] };
        if (url.includes('/servicios')) return { json: [{ nombre: 'Corte', espacios: [] }] };
        throw new Error('no debia consultar ' + url);
    });
    assert.equal(await p.w.reservasConEspacios(4, '2026-10-21', '2026-10-21', propias, null, 'Corte'), propias);
    // Varios servicios en una cita: Axilas {1,2} + Bikini {2,3} -> solo el 2
    p = supabaseConServicios(servicios);
    r = await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', [], null, 'Axilas + Bikini');
    assert.equal(r.length, 0, 'Juana {1,2} con comun {2}: el 2 esta libre');
    // Si no se pueden leer los servicios, los servicios quedan sin restriccion y todo sigue funcionando
    p = pantalla((url) => {
        if (url.includes('/configuracion')) return { json: [{ espacios_activos: true, espacios_cantidad: 3 }] };
        if (url.includes('/profesionales')) return { json: [{ id: 1, espacios: [1, 2] }] };
        if (url.includes('/servicios')) return { ok: false, status: 400, json: { code: '42703' } };
        return { json: [] };
    });
    assert.equal((await p.w.reservasConEspacios(1, '2026-10-21', '2026-10-21', propias, null, 'Pedicura')).length, 1, 'sin lectura de servicios: solo cuentan los de la profesional');

    console.log('espacios: ok');
})().catch(e => { console.error(e); process.exit(1); });
