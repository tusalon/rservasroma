// Eliminar un profesional.
//
// EL CASO QUE LO DESTAPO
// 238 de los 407 profesionales de produccion tienen reservas. La base no deja borrar a quien aparece
// en una reserva (reservas.profesional_id no tiene ON DELETE), asi que el DELETE fallaba, `eliminar`
// devolvia false y el panel ignoraba el resultado: la duena confirmaba y no pasaba nada, sin mensaje.
//
// QUE FIJA ESTA PRUEBA
// 1. consecuenciasDeEliminar cuenta las reservas (aunque sean viejas) y nombra los servicios que se
//    quedarian sin ningun profesional (solo los activos, y solo los que atendia unicamente este).
// 2. eliminar devuelve false cuando la base rechaza el borrado, sin tirar excepcion.
// El panel (components/admin/ProfesionalesPanel.js) usa 1 para avisar antes de borrar y 2 para mostrar
// un error si algo falla.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(respuestas) {
    const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'profesionales.js'), 'utf8');
    const llamadas = [];
    const respuesta = (cuerpo, { status = 200, rango = null } = {}) => ({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (n) => (n.toLowerCase() === 'content-range' ? rango : null) },
        json: async () => cuerpo,
    });
    const window = {
        SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
        getNegocioId: () => 'neg-1',
        dispatchEvent() {},
        Event: class {},
    };
    window.window = window;
    const contexto = {
        window,
        console: { log() {}, warn() {}, error() {} },
        setTimeout: () => 0,
        getNegocioId: () => 'neg-1',
        Event: class {},
        fetch: async (url, opciones = {}) => {
            llamadas.push({ url, metodo: opciones.method || 'GET' });
            return respuestas(url, opciones, respuesta);
        },
    };
    vm.runInNewContext(fuente, contexto);
    return { api: window.salonProfesionales, llamadas };
}

(async () => {
    // 1a. Con reservas: las cuenta aunque haya servicios compartidos
    {
        const { api } = cargar((url, opciones, r) => {
            if (url.includes('/reservas?')) return r([], { status: 206, rango: '0-0/12' });
            if (url.includes('/servicios_profesionales?') && url.includes('profesional_id=eq.7')) return r([]);
            return r([]);
        });
        const c = await api.consecuenciasDeEliminar(7);
        assert.equal(c.reservas, 12, 'cuenta todas las reservas, no solo las futuras');
        assert.deepEqual([...c.serviciosSinNadie], []);
    }

    // 1b. Sin reservas: nombra los servicios que se quedarian sin nadie (solo activos)
    {
        const { api } = cargar((url, opciones, r) => {
            if (url.includes('/reservas?')) return r([], { status: 206, rango: '*/0' });
            if (url.includes('/servicios_profesionales?') && url.includes('profesional_id=eq.7')) {
                return r([{ servicio_id: 1 }, { servicio_id: 2 }, { servicio_id: 3 }]);
            }
            if (url.includes('/servicios_profesionales?') && url.includes('servicio_id=in.(1,2,3)')) {
                return r([
                    { servicio_id: 1, profesional_id: 7 },
                    { servicio_id: 2, profesional_id: 7 },
                    { servicio_id: 2, profesional_id: 8 },
                    { servicio_id: 3, profesional_id: 7 },
                ]);
            }
            if (url.includes('/servicios?')) {
                return r([
                    { id: 1, nombre: 'Corte', activo: true },
                    { id: 2, nombre: 'Barba', activo: true },
                    { id: 3, nombre: 'Servicio apagado', activo: false },
                ]);
            }
            return r([]);
        });
        const c = await api.consecuenciasDeEliminar(7);
        assert.equal(c.reservas, 0);
        assert.deepEqual([...c.serviciosSinNadie], ['Corte'], 'Barba lo atiende tambien el 8; el apagado no cuenta');
    }

    // 1c. Si la base falla al contar reservas, lanza (el panel avisa y NO deja borrar a ciegas)
    {
        const { api } = cargar((url, opciones, r) => r({}, { status: 500 }));
        await assert.rejects(() => api.consecuenciasDeEliminar(7));
    }

    // 2. La base rechaza el borrado (409 por la llave foranea): false, sin excepcion y sin recargar
    {
        const { api, llamadas } = cargar((url, opciones, r) => {
            if (opciones.method === 'DELETE') return r({ code: '23503' }, { status: 409 });
            return r([]);
        });
        assert.equal(await api.eliminar(7), false);
        assert.equal(llamadas.filter((l) => l.metodo === 'DELETE').length, 1);
    }

    console.log('OK: eliminar profesional (consecuencias y rechazo de la base)');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
