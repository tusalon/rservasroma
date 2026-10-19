// Crear una categoria en un salon que aun no tiene ninguna guardada (utils/servicios.js).
//
// EL FALLO: un salon nuevo ve las categorias por defecto (manicura, pedicura...) solo "en pantalla". Al
// guardar la primera categoria propia, la lista pasaba a ser SOLO lo que hay en la base: las de siempre
// desaparecian y sus servicios caian a "Otros". En produccion habia 36 salones configurados asi.
//
// QUE FIJA ESTA PRUEBA
// 1. Salon sin categorias: antes de crear la nueva se guardan las 7 por defecto (sin duplicar si ya estaban).
// 2. Salon que ya tiene categorias: no se vuelven a sembrar.
// 3. Una categoria por defecto aun no guardada (id de texto) se resuelve a su fila real antes de editarla.
// 4. Un nombre repetido devuelve la existente marcada con yaExistia.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(responder) {
    const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'servicios.js'), 'utf8');
    const llamadas = [];
    const resp = (cuerpo, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) });
    const window = {
        SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon',
        getNegocioId: () => 'neg-1', dispatchEvent() {}, Event: class {},
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
    };
    window.window = window;
    const contexto = {
        window, localStorage: window.localStorage,
        document: { querySelector() { return null; }, addEventListener() {} },
        console: { log() {}, warn() {}, error() {} },
        setTimeout: () => 0, clearTimeout() {}, Event: class {}, getNegocioId: () => 'neg-1',
        fetch: async (url, opciones = {}) => {
            const llamada = { url: String(url), metodo: opciones.method || 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null, prefer: (opciones.headers || {}).Prefer || '' };
            llamadas.push(llamada);
            return responder(llamada, resp);
        }
    };
    vm.runInNewContext(fuente, contexto, { filename: 'servicios.js' });
    return { api: window.salonCategoriasServicios, llamadas };
}

(async () => {
    // 1. Salon SIN categorias: siembra las 7 por defecto y despues crea la nueva
    {
        let sembrado = false;
        const { api, llamadas } = cargar((l, r) => {
            if (l.url.includes('select=id&limit=1')) return r(sembrado ? [{ id: 1 }] : []);
            if (l.metodo === 'POST' && l.url.includes('on_conflict=negocio_id,slug')) { sembrado = true; return r([]); }
            if (l.metodo === 'POST') return r([{ id: 99, nombre: 'Maquillaje', slug: 'maquillaje' }]);
            return r([]);
        });
        const creada = await api.crear({ nombre: 'Maquillaje', icono: '💄', orden: 90 });
        assert.equal(creada.nombre, 'Maquillaje');
        const posts = llamadas.filter((l) => l.metodo === 'POST');
        assert.equal(posts.length, 2, 'primero las de por defecto, despues la nueva');
        assert.ok(posts[0].url.includes('on_conflict=negocio_id,slug'));
        assert.ok(posts[0].prefer.includes('ignore-duplicates'), 'si ya estaban, no se duplican');
        assert.equal(posts[0].cuerpo.length, 7);
        assert.deepEqual(posts[0].cuerpo.map((c) => c.slug), ['manicura', 'pedicura', 'faciales', 'barberia', 'cejas', 'combos', 'otros']);
        assert.ok(posts[0].cuerpo.every((c) => c.negocio_id === 'neg-1'));
        assert.equal(posts[1].cuerpo.slug, 'maquillaje');
    }

    // 2. Salon que YA tiene categorias: solo crea la nueva
    {
        const { api, llamadas } = cargar((l, r) => {
            if (l.url.includes('select=id&limit=1')) return r([{ id: 5 }]);
            if (l.metodo === 'POST') return r([{ id: 99, nombre: 'Spa', slug: 'spa' }]);
            return r([]);
        });
        await api.crear({ nombre: 'Spa' });
        assert.equal(llamadas.filter((l) => l.metodo === 'POST').length, 1, 'no se vuelve a sembrar');
    }

    // 3. Editar una categoria por defecto aun no guardada: se resuelve a su id real
    {
        let sembrado = false;
        const { api, llamadas } = cargar((l, r) => {
            if (l.url.includes('select=id&limit=1') && !l.url.includes('slug=')) return r(sembrado ? [{ id: 1 }] : []);
            if (l.metodo === 'POST') { sembrado = true; return r([]); }
            if (l.url.includes('slug=eq.manicura')) return r([{ id: 41 }]);
            if (l.metodo === 'PATCH') return r([{ id: 41, nombre: 'Uñas' }]);
            return r([]);
        });
        const actualizada = await api.actualizar('manicura', { nombre: 'Uñas' });
        assert.equal(actualizada.id, 41);
        const patch = llamadas.find((l) => l.metodo === 'PATCH');
        assert.ok(patch.url.includes('id=eq.41'), 'el PATCH usa el id numerico, no "manicura"');
    }

    // 4. Nombre repetido: devuelve la existente y lo dice
    {
        const { api } = cargar((l, r) => {
            if (l.url.includes('select=id&limit=1')) return r([{ id: 5 }]);
            if (l.metodo === 'POST') return r({ code: '23505' }, 409);
            if (l.url.includes('slug=eq.cejas')) return r([{ id: 7, nombre: 'Cejas', slug: 'cejas' }]);
            return r([]);
        });
        const r = await api.crear({ nombre: 'Cejas' });
        assert.equal(r.yaExistia, true);
        assert.equal(r.id, 7);
    }

    console.log('OK: categorias de servicios (sembrado y duplicadas)');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
