// Comprueba la logica del catalogo de disenos que no depende del navegador:
// el promedio de votos, las categorias derivadas y las miniaturas de Cloudinary.
//
// Lo que protege: un diseno recien subido no debe mostrar "0%" (parece que
// gusto a nadie cuando en realidad nadie ha votado), y las miniaturas del grid
// deben pedirse pequenas — si la transformacion se rompe, cada tarjeta baja la
// foto original y el catalogo se vuelve inusable con 3G.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(archivo) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'utils', archivo), 'utf8');
    const almacen = {};
    const window = {
        localStorage: {
            getItem: (k) => (k in almacen ? almacen[k] : null),
            setItem: (k, v) => { almacen[k] = String(v); },
            removeItem: (k) => { delete almacen[k]; }
        }
    };
    window.window = window;

    const contexto = {
        window,
        localStorage: window.localStorage,
        document: { createElement() { return {}; } },
        console: { log() {}, warn() {}, error() {} },
        Image: function () {},
        URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
        fetch() { throw new Error('La prueba no debe consultar la red'); }
    };

    vm.runInNewContext(source, contexto, { filename: archivo });
    return window;
}

const catalogo = cargar('catalogo.js');
const storage = cargar('storage.js');

// --- Promedio de votos ---
assert.equal(
    catalogo.catalogoPromedio({ votos_suma: 0, votos_conteo: 0 }),
    null,
    'Un diseno sin votos no debe devolver 0: la tarjeta no muestra insignia'
);
assert.equal(catalogo.catalogoPromedio({ votos_suma: 250, votos_conteo: 3 }), 83);
assert.equal(catalogo.catalogoPromedio({ votos_suma: 100, votos_conteo: 1 }), 100);
assert.equal(catalogo.catalogoPromedio(null), null);

// --- Categorias derivadas: ordenadas por cantidad, sin vacias ---
const categorias = catalogo.catalogoCategorias([
    { categoria: 'Navidad' },
    { categoria: 'Floral' },
    { categoria: 'Navidad' },
    { categoria: '   ' },
    { categoria: null }
]);
// JSON y no deepEqual: los objetos nacen dentro del vm y no comparten prototipo.
assert.equal(
    JSON.stringify(categorias),
    JSON.stringify([{ nombre: 'Navidad', total: 2 }, { nombre: 'Floral', total: 1 }])
);

// --- Secciones por categoria ---
// Lo que protege: que ningun diseno desaparezca de la galeria al agruparla.
// Un diseno sin categoria (fila vieja o editada a mano) debe caer en "Otros",
// no evaporarse.
const grupos = catalogo.catalogoAgrupar([
    { id: 1, categoria: 'Floral' },
    { id: 2, categoria: 'Navidad' },
    { id: 3, categoria: 'Navidad' },
    { id: 4, categoria: null },
    { id: 5, categoria: 'Navidad' }
]);
assert.equal(
    JSON.stringify(grupos.map(g => [g.nombre, g.disenos.length])),
    JSON.stringify([['Navidad', 3], ['Floral', 1], ['Otros', 1]]),
    'Mas trabajos primero y "Otros" al final'
);
assert.equal(
    grupos.reduce((total, g) => total + g.disenos.length, 0),
    5,
    'Agrupar no puede perder ningun diseno'
);
assert.equal(
    JSON.stringify(grupos[0].disenos.map(d => d.id)),
    JSON.stringify([2, 3, 5]),
    'Dentro de cada seccion se conserva el orden que trajo la consulta'
);
assert.equal(JSON.stringify(catalogo.catalogoAgrupar([])), '[]');

// --- Miniaturas de Cloudinary ---
const original = 'https://res.cloudinary.com/uyvla7fj/image/upload/v1/rservasroma/catalogo/diseno-1.jpg';
assert.equal(
    storage.urlImagenCloudinary(original, 500),
    'https://res.cloudinary.com/uyvla7fj/image/upload/w_500,c_limit,q_auto,f_auto/v1/rservasroma/catalogo/diseno-1.jpg'
);
assert.ok(
    storage.urlImagenCloudinary(original, 24).includes('e_blur'),
    'El placeholder de 24px debe pedirse borroso'
);
assert.equal(
    storage.urlImagenCloudinary('https://otro-servidor.com/foto.jpg', 500),
    'https://otro-servidor.com/foto.jpg',
    'Una URL que no es de Cloudinary se devuelve intacta'
);
assert.equal(storage.urlImagenCloudinary(null, 400), '');

// --- Huella del dispositivo: estable entre llamadas ---
const id1 = catalogo.catalogoIdDispositivo();
const id2 = catalogo.catalogoIdDispositivo();
assert.equal(id1, id2, 'El mismo dispositivo debe reusar su huella, no generar una nueva');

console.log('OK: catalogo.test.js');
