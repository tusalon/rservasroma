// Comprueba cómo se lee un contacto de la agenda del teléfono
// (utils/contactos.js), que es la parte que puede fallar en silencio.
//
// Lo que protege: en una agenda cubana los números se guardan de mil formas
// —"5401 2345", "+53 54012345", "0054012345"—. Si el código de país se
// adivina mal, la reserva se guarda con un WhatsApp que no existe y el
// recordatorio nunca llega. Peor: "54012345" empieza por 54, que es
// Argentina.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { separarContactoTelefono, normalizarContactos, soportaContactos } =
    require('../utils/contactos.js');

// El detector real de utils/phone-utils.js, no uno de mentira: si cambian los
// países o las longitudes, esta prueba tiene que enterarse.
function cargarDetectorReal() {
    const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'phone-utils.js'), 'utf8');
    const window = { localStorage: { getItem: () => null, setItem() {} } };
    window.window = window;
    vm.runInNewContext(fuente, {
        window,
        localStorage: window.localStorage,
        console: { log() {} }
    }, { filename: 'phone-utils.js' });
    return window.detectarPaisTelefono;
}

const detectar = cargarDetectorReal();
assert.equal(typeof detectar, 'function', 'phone-utils debe exportar detectarPaisTelefono');

// --- Número local, sin prefijo: lo normal en una agenda cubana ---
{
    const r = separarContactoTelefono('5401 2345', '53', detectar);
    assert.deepEqual({ ...r }, { codigoPais: '53', local: '54012345' },
        'un número cubano de 8 dígitos NO puede leerse como Argentina (+54)');
}

// --- Con prefijo internacional ---
{
    assert.deepEqual({ ...separarContactoTelefono('+53 5401 2345', '53', detectar) },
        { codigoPais: '53', local: '54012345' });
    assert.deepEqual({ ...separarContactoTelefono('+1 305 555 1234', '53', detectar) },
        { codigoPais: '1', local: '3055551234' }, 'un número de USA se separa bien');
    assert.deepEqual({ ...separarContactoTelefono('+34 612345678', '53', detectar) },
        { codigoPais: '34', local: '612345678' }, 'España');
}

// --- El país por defecto es el del salón, no siempre Cuba ---
{
    const r = separarContactoTelefono('612345678', '34', detectar);
    assert.deepEqual({ ...r }, { codigoPais: '34', local: '612345678' },
        'un salón en España guarda sus números locales como españoles');
}

// --- Basura: no revienta y no inventa ---
{
    assert.equal(separarContactoTelefono('', '53', detectar), null);
    assert.equal(separarContactoTelefono(null, '53', detectar), null);
    assert.equal(separarContactoTelefono('sin numero', '53', detectar), null,
        'un contacto sin dígitos se descarta, no se guarda vacío');
}

// --- Lo que devuelve el selector: arrays, repetidos, sin nombre ---
{
    const seleccion = [
        { name: ['Yamila Corrales'], tel: ['+53 5401 2345'] },
        { name: ['Sin teléfono'], tel: [] },
        { name: [], tel: ['52083376'] },
        { name: ['Repetida'], tel: ['5354012345'] },
        { name: ['Varios números'], tel: ['54099887', '54011122'] }
    ];
    const lista = normalizarContactos(seleccion, '53', detectar);

    assert.equal(lista.length, 3, 'se cae el que no tiene teléfono y el repetido');
    assert.deepEqual({ ...lista[0] },
        { nombre: 'Yamila Corrales', codigoPais: '53', local: '54012345', completo: '5354012345' });
    assert.equal(lista[1].nombre, '52083376',
        'un contacto sin nombre usa su número: la reserva necesita algo que enseñar');
    assert.equal(lista[2].local, '54099887', 'de varios teléfonos se toma el primero');

    // El repetido es el mismo número que el primero pero escrito distinto.
    assert.equal(lista.filter(c => c.completo === '5354012345').length, 1,
        'el mismo número escrito de dos formas no se añade dos veces');
}

// --- Sin navegador, no hay soporte (y no lanza) ---
assert.equal(soportaContactos(), false,
    'en Node no existe navigator.contacts: la detección debe decir que no');

console.log('OK: contactos.test.js');
