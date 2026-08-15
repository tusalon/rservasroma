// Vigila el coste en base de datos del refresco automatico de la agenda.
//
// El 12/08/2026 el proyecto de Supabase se quedo sin recursos y la app mandaba
// a todos los salones al panel offline. Query Performance lo dejo claro: no
// habia ninguna consulta lenta, habia demasiadas. El bucle del panel se
// llevaba ~16 % del tiempo total de la base:
//
//   getAllBookings()               ~250.000 llamadas   9,8 %
//   marcarTurnosCompletados()       246.428 llamadas   3,6 %
//   deleteExpiredPendingBookings()   19.292 llamadas   2,3 %
//
// Corria cada 60 s en cada panel abierto, tambien con el telefono en el
// bolsillo, y cada cliente repetia el mantenimiento de todo el salon.
//
// Estas comprobaciones son sobre el texto del fuente. No prueban el
// comportamiento, solo evitan que los tres arreglos se pierdan sin querer en
// una edicion futura.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fuente = fs.readFileSync(path.join(__dirname, '..', 'admin-app.js'), 'utf8');

const bloqueRefresco = fuente.slice(
    fuente.indexOf('const REFRESCO_MS'),
    fuente.indexOf('removeEventListener(\'visibilitychange\', alVolverAlPanel)')
);

assert.ok(bloqueRefresco, 'no se encontro el bucle de refresco de la agenda');

// 1) No refrescar con el panel escondido: en un movil el panel se queda
//    "abierto" en segundo plano durante horas.
assert.match(bloqueRefresco, /if \(document\.hidden\) return;/);
assert.match(bloqueRefresco, /addEventListener\('visibilitychange'/);

// 2) Cada 5 minutos, no cada minuto.
assert.match(bloqueRefresco, /REFRESCO_MS = 5 \* 60 \* 1000/);

// 3) Una sola pasada de marcado por vuelta. Antes se llamaba tambien desde el
//    intervalo, ademas de dentro de fetchBookings.
assert.doesNotMatch(
    bloqueRefresco,
    /marcarTurnosCompletados/,
    'el intervalo no debe llamar marcarTurnosCompletados: ya lo hace fetchBookings'
);
const llamadasAMarcar = fuente.match(/await marcarTurnosCompletados\(\)|marcarTurnosCompletados\(\)\.then/g) || [];
assert.equal(llamadasAMarcar.length, 1, 'marcarTurnosCompletados solo debe invocarse una vez por refresco');

// 4) La limpieza de pendientes vencidas va con freno propio: el vencimiento se
//    mide en horas, no hace falta un DELETE por refresco y por panel.
assert.match(fuente, /MS_ENTRE_LIMPIEZAS_PENDIENTES = 10 \* 60 \* 1000/);
assert.match(fuente, /if \(Date\.now\(\) - ultimaLimpiezaPendientes < MS_ENTRE_LIMPIEZAS_PENDIENTES\) return 0;/);

// 5) El marcado tambien, porque el trabajo de verdad lo hace el cron.
assert.match(fuente, /MS_ENTRE_MARCADOS_COMPLETADOS = 10 \* 60 \* 1000/);
assert.match(fuente, /if \(Date\.now\(\) - ultimoMarcadoCompletados < MS_ENTRE_MARCADOS_COMPLETADOS\) return \[\];/);

// El cron que hace ese trabajo tiene que seguir en el repo, y con la misma
// zona horaria que usan las Edge Functions: si se calcula en UTC, a los
// salones de Cuba se les darian por completados turnos que aun no empezaron.
const cron = fs.readFileSync(path.join(__dirname, '..', 'sql-cron-marcar-completados.sql'), 'utf8');
assert.match(cron, /create or replace function public\.marcar_turnos_completados\(\)/i);
assert.match(cron, /now\(\) at time zone 'America\/Havana'/);
assert.match(cron, /cron\.schedule\(\s*'marcar-turnos-completados',\s*'\*\/5 \* \* \* \*'/);
assert.match(cron, /set search_path = ''/);
assert.doesNotMatch(cron, /hora_fin\s*<\s*ahora::time[^=]/, 'el corte debe ser <=, no <: un turno que acaba justo ahora ya termino');

console.log('OK: refresco de agenda sigue siendo barato para la base');
