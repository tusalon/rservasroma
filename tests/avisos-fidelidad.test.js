// avisos-fidelidad: la funcion del servidor cuenta citas igual que la app (utils/turnos.js + utils/fidelizacion.js)
// y solo avisa cuando le falta 1 cita o ya tiene el descuento.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const turnos = require('../utils/turnos.js');
const app = require('../utils/fidelizacion.js');

(async () => {
    const srv = await import('../supabase/functions/avisos-fidelidad/cuenta.mjs');
    const cfg = { fidelizacion_activa: true, fidelizacion_cada_citas: 5, fidelizacion_descuento_porcentaje: 50 };

    // Filas con combos (3 servicios seguidos = 1 cita) y citas sueltas, en varios dias.
    const fila = (id, fecha, ini, fin) => ({ id, fecha, hora_inicio: ini, hora_fin: fin, duracion: 60, estado: 'Completado', cliente_whatsapp: '51234567' });
    const filas = [
        fila(1, '2026-09-01', '09:00', '10:00'), fila(2, '2026-09-01', '10:00', '11:00'), fila(3, '2026-09-01', '11:00', '12:00'),
        fila(4, '2026-09-08', '09:00', '10:00'),
        fila(5, '2026-09-15', '09:00', '10:00'), fila(6, '2026-09-15', '10:00', '11:00'),
        fila(7, '2026-09-22', '09:00', '10:00'),
        fila(8, '2026-09-29', '09:00', '10:00'),
        fila(9, '2026-10-06', '09:00', '10:00'),
        fila(10, '2026-10-13', '09:00', '10:00'),
    ];

    // Misma agrupacion y mismas tarjetas, con y sin ajuste, para cada tramo de citas.
    for (let n = 0; n <= filas.length; n++) {
        const parte = filas.slice(0, n);
        const citasApp = turnos.agruparTurnos(parte);
        const citasSrv = srv.agruparCitas(parte);
        assert.equal(citasSrv.length, citasApp.length, `mismas citas con ${n} filas`);
        for (const ajuste of [0, 1, 3, 99]) {
            const a = app.tarjetaFidelizacion(cfg, citasApp, ajuste);
            const s = srv.estadoTarjeta(cfg, citasSrv, ajuste);
            assert.deepEqual([s.visitas, s.faltan, s.premiada], [a.visitas, a.faltan, a.premiada], `filas=${n} ajuste=${ajuste}`);
        }
    }

    // Sin fidelizacion no hay tarjeta; con 0 % tampoco.
    assert.equal(srv.estadoTarjeta({}, [], 0).activa, false);
    assert.equal(srv.estadoTarjeta({ ...cfg, fidelizacion_descuento_porcentaje: 0 }, [], 0).activa, false);

    // Textos: solo "falta 1" y "premiada"; con 2 o mas citas por delante no se molesta a nadie.
    const citas = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, filas: [{ id: i + 1 }] }));
    const aviso = (n) => srv.textoAviso(srv.estadoTarjeta(cfg, citas(n), 0), 'Salon Ana', 'Maria Perez');
    assert.equal(aviso(0), null);
    assert.equal(aviso(3), null);
    assert.equal(aviso(4).tipo, 'falta1');
    assert.match(aviso(4).title, /Solo te falta 1 cita en Salon Ana/);
    assert.match(aviso(4).body, /^Maria, .*50% de descuento/);
    assert.equal(aviso(5).tipo, 'premiada');
    assert.match(aviso(5).title, /50% de descuento/);
    assert.equal(aviso(6), null, 'al completar la premiada empieza una tarjeta nueva');
    assert.equal(aviso(10).tipo, 'falta1');
    assert.equal(aviso(11).tipo, 'premiada');
    assert.equal(srv.textoAviso(srv.estadoTarjeta(cfg, citas(5), 0), 'X', '').body.startsWith('completaste'), true, 'sin nombre no queda una coma suelta');

    // Cableado: la funcion, el SQL del cron y la tabla anti-repeticion existen y se apuntan entre si.
    const leer = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const fn = leer('supabase/functions/avisos-fidelidad/index.ts');
    assert.match(fn, /from "\.\/cuenta\.mjs"/);
    assert.match(fn, /fidelidad_avisos/);
    assert.match(fn, /enviar-web-push/);
    const sql = leer('sql-avisos-fidelidad.sql');
    assert.match(sql, /create table if not exists public\.fidelidad_avisos/);
    assert.match(sql, /functions\/v1\/avisos-fidelidad/);
    assert.match(sql, /primary key \(negocio_id, whatsapp, citas_totales\)/);

    console.log('avisos-fidelidad: ok');
})().catch((e) => { console.error(e); process.exit(1); });
