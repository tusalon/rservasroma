// Comprueba la sesion deslizante del panel (window.sesionPanelVigente).
//
// El fallo que motivo esto: la sesion duraba 8 horas contadas desde el login y
// no se renovaba con el uso, asi que a las duenas de salon las botaba en plena
// jornada y les pedia la contrasena cada manana.

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

function cargarConfig(storage = {}) {
    const localStorage = crearStorage(storage);
    const document = {
        currentScript: { src: 'https://tusalon.github.io/rservasroma/utils/config-negocio-master.js' },
        querySelector() { return null; },
        createElement() { return { dataset: {} }; },
        head: { appendChild() {} },
        title: ''
    };
    const window = {
        location: new URL('https://tusalon.github.io/rservasroma/admin.html'),
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
        CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
        console: { log() {}, warn() {}, error() {} },
        setTimeout() { return 0; },
        clearTimeout() {},
        fetch() { throw new Error('La prueba no debe consultar la red'); }
    };

    vm.runInNewContext(source, contexto, { filename: 'config-negocio-master.js' });
    return { window, localStorage };
}

const DIA = 24 * 60 * 60 * 1000;

// Sesion de hace 10 horas: con el limite viejo de 8 h ya estaria muerta.
{
    const hace10Horas = Date.now() - 10 * 60 * 60 * 1000;
    const { window } = cargarConfig({ adminLoginTime: hace10Horas });
    assert.equal(
        window.sesionPanelVigente('adminLoginTime'),
        true,
        'una jornada larga no debe cerrar la sesion'
    );
}

// Al otro dia por la manana: el caso exacto que obligaba a poner la clave a diario.
{
    const ayer = Date.now() - 15 * 60 * 60 * 1000;
    const { window } = cargarConfig({ adminLoginTime: ayer });
    assert.equal(
        window.sesionPanelVigente('adminLoginTime'),
        true,
        'abrir la app al dia siguiente no debe pedir contrasena'
    );
}

// El reloj se reinicia al confirmar la sesion (es deslizante, no fija).
{
    const hace6Dias = Date.now() - 6 * DIA;
    const { window, localStorage } = cargarConfig({ adminLoginTime: hace6Dias });
    window.sesionPanelVigente('adminLoginTime');
    const renovada = parseInt(localStorage.getItem('adminLoginTime'), 10);
    assert.ok(
        renovada > hace6Dias,
        'confirmar la sesion debe renovar la marca de tiempo'
    );
    assert.ok(
        Date.now() - renovada < 5000,
        'la marca renovada debe quedar en el momento actual'
    );
}

// Pasado el limite si caduca: 7 dias sin abrir el panel.
{
    const hace8Dias = Date.now() - 8 * DIA;
    const { window, localStorage } = cargarConfig({ adminLoginTime: hace8Dias });
    assert.equal(
        window.sesionPanelVigente('adminLoginTime'),
        false,
        'tras 7 dias sin entrar la sesion debe caducar'
    );
    assert.equal(
        parseInt(localStorage.getItem('adminLoginTime'), 10),
        hace8Dias,
        'una sesion caducada no debe renovarse'
    );
}

// Sin marca de tiempo (nunca hizo login) no hay sesion.
{
    const { window } = cargarConfig({});
    assert.equal(window.sesionPanelVigente('adminLoginTime'), false, 'sin login no hay sesion');
}

// Una marca corrupta no debe dar acceso.
{
    const { window } = cargarConfig({ adminLoginTime: 'no-es-un-numero' });
    assert.equal(window.sesionPanelVigente('adminLoginTime'), false, 'marca invalida = sin sesion');
}

console.log('OK: sesion deslizante del panel verificada');
