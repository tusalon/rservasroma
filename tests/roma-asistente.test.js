// Roma (asistente del panel): entiende las preguntas de siempre y lleva a la pantalla correcta.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const roma = require('../utils/roma-asistente.js');

// Las cuatro preguntas que se le ofrecen a la dueña tienen que funcionar en los dos idiomas.
const esperado = ['cerrar-dia', 'servicio', 'pago', 'mover-cita'];
['es', 'en'].forEach(idioma => {
    roma.sugerencias(idioma).forEach((pregunta, i) => {
        const r = roma.responder(pregunta, idioma);
        assert.equal(r.id, esperado[i], `[${idioma}] "${pregunta}" debe llevar a ${esperado[i]}, llevó a ${r.id}`);
        assert.ok(r.texto.length > 20);
    });
});

// Preguntas escritas a la brava, sin tildes ni signos.
const casos = [
    ['como pongo vacaciones', 'cerrar-dia'],
    ['quiero cambiarle el horario a ana', 'horario'],
    ['donde subo fotos de mis unas', 'catalogo'],
    ['como comparto mi link', 'enlace'],
    ['una clienta no vino', 'ausente'],
    ['cuanto he ganado este mes', 'numeros'],
    ['necesito cancelar una cita', 'cancelar'],
    ['quien eres', 'quien'],
    ['where do I see my waitlist', 'espera'],
    ['how do I reschedule', 'mover-cita']
];
casos.forEach(([texto, id]) => assert.equal(roma.responder(texto, 'es').id, id, texto));

// Lo que no entiende no inventa: ofrece caminos.
const nada = roma.responder('asdfgh qwerty', 'es');
assert.equal(nada.id, 'nada');
assert.ok(nada.acciones.length >= 3);

// Cada acción lleva a una pantalla (tab) o a una acción conocida, y habla el idioma pedido.
const acciones = ['nueva-reserva', 'copiar-enlace', 'datos-negocio', 'soporte'];
roma.INTENCIONES.forEach(it => {
    ['es', 'en'].forEach(idioma => {
        const r = roma.responder(it.claves[0], idioma);
        r.acciones.forEach(a => {
            assert.ok(a.etq, 'toda acción tiene etiqueta');
            assert.ok(a.tab || acciones.includes(a.accion), 'acción desconocida: ' + JSON.stringify(a));
        });
        assert.ok(it.es && it.en, 'cada respuesta existe en español e inglés: ' + it.id);
    });
});
assert.match(roma.responder('cerrar un dia', 'en').texto, /Salon closures/);

// El saludo cuenta lo que hay pendiente y no inventa nada cuando no hay nada.
const s1 = roma.saludo({ citasHoy: 2, pendientesPago: 1, clientasNuevas: 3 }, 'es');
assert.match(s1.texto, /1 cita espera el anticipo/);
assert.match(s1.texto, /3 clientas nuevas esperan/);
assert.match(s1.texto, /Hoy tienes 2 citas/);
assert.deepEqual(s1.acciones.map(a => a.tab), ['agenda', 'clientas-nuevas', 'reservas']);
assert.match(roma.saludo({}, 'es').texto, /Todo está al día/);
assert.match(roma.saludo({ citasHoy: 1 }, 'en').texto, /Today you have 1 appointment\./);

// Cableado: el panel carga a Roma, la cachea y la pone en pantalla.
const leer = f => fs.readFileSync(require('node:path').join(__dirname, '..', f), 'utf8');
assert.match(leer('admin.html'), /utils\/roma-asistente\.js/);
assert.match(leer('admin.html'), /compiled\/components\/admin\/AsistenteRoma\.js/);
assert.match(leer('sw.js'), /utils\/roma-asistente\.js/);
assert.match(leer('sw.js'), /compiled\/components\/admin\/AsistenteRoma\.js/);
roma.POSES.concat(roma.CARAS).forEach(nombre => {
    assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', 'images/roma/poses/' + nombre + '.webp')), 'falta la imagen de la pose ' + nombre);
    assert.match(leer('sw.js'), new RegExp('images/roma/poses/' + nombre + '\.webp'), 'sw.js no cachea la pose ' + nombre);
});
assert.match(leer('admin-app.js'), /<AsistenteRoma/);

// Cada respuesta trae una pose que existe; el saludo celebra si todo está al día y llama la atención si hay algo esperando.
Object.entries(roma.POSE_POR_INTENCION).forEach(([id, pose]) => assert.ok(roma.POSES.includes(pose), id + ' usa una pose que no existe: ' + pose));
roma.INTENCIONES.forEach(it => assert.ok(roma.POSE_POR_INTENCION[it.id], 'la intención ' + it.id + ' no tiene pose'));
assert.ok(roma.POSES.includes(roma.responder('asdfgh qwerty', 'es').pose));
assert.equal(roma.saludo({}, 'es').pose, 'celebra');
assert.equal(roma.saludo({ pendientesPago: 1 }, 'es').pose, 'megafono');
assert.equal(roma.saludo({ citasHoy: 2 }, 'es').pose, 'saluda');

console.log('roma-asistente: ok');
