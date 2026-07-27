const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'utils', 'config-negocio-master.js'),
    'utf8'
);

function crearStorage(valores = {}) {
    const datos = new Map(Object.entries(valores).map(([clave, valor]) => [clave, String(valor)]));
    return {
        getItem(clave) { return datos.has(clave) ? datos.get(clave) : null; },
        setItem(clave, valor) { datos.set(clave, String(valor)); },
        removeItem(clave) { datos.delete(clave); }
    };
}

function cargarConfig({ href, scriptSrc, storage = {} }) {
    const location = new URL(href);
    const localStorage = crearStorage(storage);
    const document = {
        currentScript: { src: scriptSrc },
        querySelector() { return null; },
        createElement() { return { dataset: {} }; },
        head: { appendChild() {} },
        title: ''
    };
    const window = {
        location,
        localStorage,
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-test',
        dispatchEvent() {}
    };
    window.window = window;

    const contexto = {
        window,
        document,
        localStorage,
        URL,
        URLSearchParams,
        Blob,
        CustomEvent: class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        },
        console: { log() {}, warn() {}, error() {} },
        setTimeout() { return 0; },
        clearTimeout() {},
        fetch() { throw new Error('La prueba no debe consultar la red'); }
    };

    vm.runInNewContext(source, contexto, { filename: 'config-negocio-master.js' });
    return { window, localStorage };
}

const scriptGithub = 'https://tusalon.github.io/rservasroma/utils/config-negocio-master.js';

{
    const { window } = cargarConfig({
        href: 'https://tusalon.github.io/rservasroma/admin.html',
        scriptSrc: scriptGithub,
        storage: {
            negocioId: 'id-tulip',
            adminSlug: 'tulipsalon',
            negocioSlug: 'rservasroma'
        }
    });

    assert.equal(window._rservasSlugActual, null, 'la carpeta del repositorio no puede ser un slug');
    assert.equal(window.NEGOCIO_ID_POR_DEFECTO, 'id-tulip', 'el panel debe usar el negocio de la sesión');
    assert.equal(
        window.construirRutaConSlug('admin.html'),
        '/rservasroma/admin.html?s=tulipsalon',
        'el regreso al panel debe conservar el slug administrativo'
    );
}

{
    const ahora = Date.now();
    const { window } = cargarConfig({
        href: 'https://tusalon.github.io/rservasroma/admin.html?s=tulipsalon',
        scriptSrc: scriptGithub,
        storage: {
            rsmid_tulipsalon: 'id-tulip',
            rsmttl_tulipsalon: ahora
        }
    });

    assert.equal(window._rservasSlugActual, 'tulipsalon', 'el parámetro ?s= tiene prioridad');
}

{
    const ahora = Date.now();
    const { window } = cargarConfig({
        href: 'https://tusalon.github.io/rservasroma/tulipsalon/',
        scriptSrc: scriptGithub,
        storage: {
            rsmid_tulipsalon: 'id-tulip',
            rsmttl_tulipsalon: ahora
        }
    });

    assert.equal(window._rservasSlugActual, 'tulipsalon', 'la ruta del cliente debe omitir la base de GitHub Pages');
}

{
    const { window } = cargarConfig({
        href: 'https://tusalon.github.io/rservasroma/',
        scriptSrc: scriptGithub
    });

    assert.equal(window._rservasSlugActual, null, 'la raíz del repositorio no representa un negocio');
}

{
    const ahora = Date.now();
    const { window } = cargarConfig({
        href: 'https://app.rservasroma.com/tulipsalon/',
        scriptSrc: 'https://app.rservasroma.com/utils/config-negocio-master.js',
        storage: {
            rsmid_tulipsalon: 'id-tulip',
            rsmttl_tulipsalon: ahora
        }
    });

    assert.equal(window._rservasSlugActual, 'tulipsalon', 'la ruta directa del dominio propio debe seguir funcionando');
}

console.log('OK: rutas por negocio verificadas');
