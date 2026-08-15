// Copia de seguridad de la base a ficheros JSON, sin instalar nada.
//
//   node tools/backup-supabase.js [carpeta-destino]
//
// POR QUE EXISTE
// El plan Free de Supabase NO hace ninguna copia de seguridad: las diarias
// empiezan en Pro. Hoy hay 379 salones, 10.240 reservas y 3.761 clientas sin
// ninguna red debajo. La via oficial es `supabase db dump`, pero necesita
// Docker o pg_dump, y en este equipo no hay ninguno de los dos.
//
// Esto no lo sustituye: es lo que se puede hacer HOY sin instalar nada.
//
// LIMITE IMPORTANTE
// Usa la clave anon, la misma que la web. Las tablas que la tienen denegada
// (las seis de RomaFinanzas) NO se copian, y el script lo dice al terminar en
// vez de callarselo. Esas hay que sacarlas del Table Editor de Supabase con
// "Export CSV", o con un pg_dump de verdad cuando se pueda.

const fs = require('node:fs');
const path = require('node:path');

const SUPABASE_URL = 'https://zorhclhvykikaachfrmp.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || leerClaveDelRepo();

// Sacadas de las llamadas rest/v1/... y .from(...) de rservasroma y SuperAdmin.
const TABLAS = [
    'negocios', 'configuracion', 'config_global',
    'profesionales', 'servicios', 'servicios_profesionales', 'categorias_servicios',
    'horarios_profesionales', 'horarios_excepciones_profesionales', 'dias_cerrados',
    'reservas', 'lista_espera',
    'clientes_autorizados', 'clientes_bloqueados',
    'suscripciones', 'usuarios_negocio', 'tiendas_credenciales',
    'push_suscripciones', 'push_subscriptions', 'push_resumenes_enviados',
    'reportes_tienda',
    'roma_finanzas_ingresos', 'roma_finanzas_gastos', 'roma_finanzas_materials',
    'roma_finanzas_services', 'roma_finanzas_fichas_costo', 'roma_finanzas_config'
];

function leerClaveDelRepo() {
    const archivo = path.join(__dirname, '..', 'utils', 'supabase-config.js');
    const m = fs.readFileSync(archivo, 'utf8').match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
    if (!m) throw new Error('No se encontro SUPABASE_ANON_KEY en utils/supabase-config.js');
    return m[1];
}

async function traerTodo(tabla) {
    const filas = [];
    // PostgREST devuelve 1000 filas como maximo por peticion: hay que paginar
    // siempre o la copia sale corta y parece completa.
    for (let desde = 0; ; desde += 1000) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*`, {
            headers: {
                apikey: ANON,
                Authorization: `Bearer ${ANON}`,
                Range: `${desde}-${desde + 999}`
            }
        });
        if (!res.ok) {
            const cuerpo = await res.text();
            const motivo = /permission denied/i.test(cuerpo) ? 'sin permiso (clave anon)'
                : /does not exist|PGRST20/i.test(cuerpo) ? 'no existe'
                : `HTTP ${res.status}`;
            return { error: motivo };
        }
        const lote = await res.json();
        filas.push(...lote);
        if (lote.length < 1000) return { filas };
    }
}

async function main() {
    const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const destino = path.resolve(process.argv[2] || path.join(__dirname, '..', 'backups', sello));
    fs.mkdirSync(destino, { recursive: true });

    const copiadas = {}, fallidas = {};
    for (const tabla of TABLAS) {
        const r = await traerTodo(tabla);
        if (r.error) {
            fallidas[tabla] = r.error;
            console.log(`  ${tabla.padEnd(36)} -- ${r.error}`);
            continue;
        }
        fs.writeFileSync(path.join(destino, `${tabla}.json`), JSON.stringify(r.filas, null, 1));
        copiadas[tabla] = r.filas.length;
        console.log(`  ${tabla.padEnd(36)} ${r.filas.length} filas`);
    }

    const resumen = { generado: new Date().toISOString(), url: SUPABASE_URL, copiadas, fallidas };
    fs.writeFileSync(path.join(destino, '_resumen.json'), JSON.stringify(resumen, null, 1));

    const total = Object.values(copiadas).reduce((a, b) => a + b, 0);
    console.log(`\nCopiadas ${Object.keys(copiadas).length} tablas, ${total} filas`);
    console.log(`Carpeta: ${destino}`);
    if (Object.keys(fallidas).length) {
        console.log(`\nNO COPIADAS (${Object.keys(fallidas).length}): ${Object.keys(fallidas).join(', ')}`);
        console.log('Esas hay que sacarlas del Table Editor de Supabase con "Export CSV".');
    }
}

main().catch(e => { console.error('Fallo la copia:', e.message); process.exit(1); });
