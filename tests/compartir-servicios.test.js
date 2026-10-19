// "Compartir servicios y precios" (utils/compartir-servicios.js): paginacion y texto de respaldo.
// La imagen en si (canvas) no se prueba aqui: hace falta un navegador.

const assert = require('node:assert/strict');
const { paginarGrupos, textoServicios, FILAS_POR_PAGINA } = require('../utils/compartir-servicios.js');

const serv = (n, prefijo = 'S') => Array.from({ length: n }, (_, i) => ({ nombre: `${prefijo}${i + 1}`, precio: `${(i + 1) * 100} CUP` }));
const contar = (paginas) => paginas.reduce((t, p) => t + p.reduce((s, g) => s + g.servicios.length, 0), 0);
const filas = (pagina) => pagina.reduce((s, g) => s + 1 + g.servicios.length, 0);

// Pocos servicios: una sola pagina
{
    const paginas = paginarGrupos([{ nombre: 'Uñas', servicios: serv(3) }, { nombre: 'Cejas', servicios: serv(2) }]);
    assert.equal(paginas.length, 1);
    assert.equal(contar(paginas), 5);
}

// Muchos: ninguna pagina pasa del limite, no se pierde ni se repite ningun servicio, el titulo se repite al seguir
{
    const grupos = [{ nombre: 'Uñas', servicios: serv(15, 'U') }, { nombre: 'Cejas', servicios: serv(4, 'C') }];
    const paginas = paginarGrupos(grupos);
    assert.ok(paginas.length >= 2);
    paginas.forEach((p) => assert.ok(filas(p) <= FILAS_POR_PAGINA, 'una pagina se paso de filas'));
    assert.equal(contar(paginas), 19);
    const nombres = paginas.flatMap((p) => p.flatMap((g) => g.servicios.map((s) => s.nombre)));
    assert.deepEqual(nombres, [...serv(15, 'U'), ...serv(4, 'C')].map((s) => s.nombre), 'orden y contenido intactos');
    assert.equal(paginas[1][0].nombre, 'Uñas', 'la categoria que sigue en la otra pagina repite su titulo');
}

// Una categoria no deja su titulo solo al final de una pagina
{
    const paginas = paginarGrupos([{ nombre: 'A', servicios: serv(9) }, { nombre: 'B', servicios: serv(3) }]);
    paginas.forEach((p) => p.forEach((g) => assert.ok(g.servicios.length >= 1, 'titulo sin servicios')));
}

// Vacio
assert.deepEqual(paginarGrupos([]), []);
assert.deepEqual(paginarGrupos([{ nombre: 'X', servicios: [] }]), []);

// Texto de respaldo para WhatsApp
{
    const t = textoServicios('Salon Ana', [{ nombre: 'Uñas', icono: '💅', servicios: [{ nombre: 'Manicure', precio: '500 CUP' }] }], 'https://tusalon.github.io/rservasroma/?s=ana');
    assert.ok(t.includes('*Salon Ana*'));
    assert.ok(t.includes('💅 *Uñas*'));
    assert.ok(t.includes('• Manicure: 500 CUP'));
    assert.ok(t.endsWith('https://tusalon.github.io/rservasroma/?s=ana'));
}

console.log('OK: compartir servicios y precios (paginacion y texto)');
