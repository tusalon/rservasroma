// Ficha de clientas: historial unificado, avisos de salud, rutas de fotos y sesion del panel.
//
// - fusionarHistorial junta las visitas anotadas con las citas completadas de la agenda sin repetir
//   las que ya tienen anotacion, y las ordena de la mas reciente a la mas antigua.
// - alertasDeSalud solo devuelve lo que tiene texto.
// - rutaFoto empieza por el negocio: la politica del bucket privado lo exige en la primera carpeta.
// - leerSesion (utils/panel-sesion.js) no da por buena una sesion caducada ni mal formada.

const assert = require('node:assert/strict');
const { fusionarHistorial, alertasDeSalud, rutaFoto, fotosPorVisita, soloDigitos } = require('../utils/ficha-clienta.js');
const { leerSesion } = require('../utils/panel-sesion.js');

// ── fusionarHistorial ──
{
    const visitas = [
        { id: 1, fecha: '2026-09-10', servicio: 'Tinte', notas: 'Raiz', reserva_id: 500 },
        { id: 2, fecha: '2026-10-01', servicio: 'Corte', notas: 'Puntas' }
    ];
    const reservas = [
        { id: 500, fecha: '2026-09-10', hora_inicio: '10:00:00', estado: 'Completado', servicio: 'Tinte' },  // ya anotada
        { id: 501, fecha: '2026-10-15', hora_inicio: '15:30:00', estado: 'Completado', servicio: 'Manicura', profesional_nombre: 'Ana' },
        { id: 502, fecha: '2026-10-20', hora_inicio: '09:00:00', estado: 'Reservado', servicio: 'Cejas' },    // futura: no
        { id: 503, fecha: '2026-08-01', hora_inicio: '09:00:00', estado: 'Cancelado', servicio: 'Cejas' }    // cancelada: no
    ];
    const h = fusionarHistorial(visitas, reservas);
    assert.deepEqual(h.map((x) => x.clave), ['r501', 'v2', 'v1'], 'mas reciente primero; la cita 500 no se repite');
    assert.equal(h[0].tipo, 'cita');
    assert.equal(h[0].hora, '15:30');
    assert.equal(h[0].reserva_id, 501);
    assert.equal(h[1].tipo, 'visita');
}
// misma fecha: la de mas tarde primero; sin datos no rompe
{
    const h = fusionarHistorial([], [
        { id: 1, fecha: '2026-10-01', hora_inicio: '09:00', estado: 'completado' },
        { id: 2, fecha: '2026-10-01', hora_inicio: '16:00', estado: 'Completado' }
    ]);
    assert.deepEqual(h.map((x) => x.clave), ['r2', 'r1']);
    assert.deepEqual(fusionarHistorial(null, null), []);
}

// ── alertasDeSalud ──
{
    assert.deepEqual(alertasDeSalud({ alergias: '  ', condiciones: '', medicamentos: null }), []);
    const a = alertasDeSalud({ alergias: 'Latex', condiciones: '', medicamentos: ' Warfarina ', notas_generales: 'x' });
    assert.deepEqual(a.map((x) => [x.campo, x.texto]), [['alergias', 'Latex'], ['medicamentos', 'Warfarina']]);
    assert.deepEqual(alertasDeSalud(null), []);
}

// ── rutaFoto y fotosPorVisita ──
{
    const ruta = rutaFoto('11111111-2222-3333-4444-555555555555', '+53 5555-1234', 'abc');
    assert.equal(ruta, '11111111-2222-3333-4444-555555555555/5355551234/abc.jpg');
    assert.ok(ruta.split('/')[0] === '11111111-2222-3333-4444-555555555555', 'el negocio va en la primera carpeta');
    assert.notEqual(rutaFoto('n', '1'), rutaFoto('n', '1'), 'sin identificador cada foto tiene el suyo');
    assert.equal(soloDigitos(null), '');
    const g = fotosPorVisita([{ id: 1, visita_id: 7 }, { id: 2, visita_id: 7 }, { id: 3, visita_id: null }]);
    assert.equal(g['7'].length, 2);
    assert.equal(g.sueltas.length, 1);
}

// ── leerSesion ──
{
    const ahora = 1_800_000_000_000;
    const alm = (valor) => ({ getItem: () => valor });
    const viva = JSON.stringify({ token: 'abc', expira_en: Math.floor(ahora / 1000) + 3600, nivel: 3 });
    assert.equal(leerSesion(alm(viva), ahora).token, 'abc');
    const caducada = JSON.stringify({ token: 'abc', expira_en: Math.floor(ahora / 1000) - 10 });
    assert.equal(leerSesion(alm(caducada), ahora), null, 'caducada');
    const porCaducar = JSON.stringify({ token: 'abc', expira_en: Math.floor(ahora / 1000) + 30 });
    assert.equal(leerSesion(alm(porCaducar), ahora), null, 'a menos de un minuto se pide de nuevo');
    assert.equal(leerSesion(alm(null), ahora), null);
    assert.equal(leerSesion(alm('no es json'), ahora), null);
    assert.equal(leerSesion(alm(JSON.stringify({ expira_en: 9e12 })), ahora), null, 'sin token');
    assert.equal(leerSesion(alm(JSON.stringify({ token: 'x' })), ahora), null, 'sin caducidad');
}

console.log('OK: ficha de clientas (historial, salud, fotos y sesion)');
