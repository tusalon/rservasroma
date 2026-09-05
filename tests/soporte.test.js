// Comprueba la parte pura del boton de soporte (utils/soporte.js): validacion
// del mensaje, armado del texto de WhatsApp y el tope de la URL de wa.me.

const assert = require('node:assert/strict');
const {
    validarMensajeSoporte,
    construirMensajeSoporte,
    linkWhatsAppSoporte,
    MAX_MENSAJE,
    MAX_URL_TEXTO
} = require('../utils/soporte.js');

// --- Validacion ---

// Vacio o casi vacio no se manda: un ticket con "hola" no sirve para nada.
{
    assert.equal(validarMensajeSoporte('').ok, false, 'un mensaje vacio se rechaza');
    assert.equal(validarMensajeSoporte('   \n  ').ok, false, 'solo espacios se rechaza');
    assert.equal(validarMensajeSoporte('hola').ok, false, 'menos de 5 caracteres se rechaza');
}

// Un mensaje normal pasa y llega limpio de espacios.
{
    const r = validarMensajeSoporte('   No me deja guardar un servicio.   ');
    assert.equal(r.ok, true);
    assert.equal(r.mensaje, 'No me deja guardar un servicio.', 'el mensaje se guarda sin espacios de sobra');
}

// El tope existe para que quepa en la URL de wa.me.
{
    assert.equal(validarMensajeSoporte('a'.repeat(MAX_MENSAJE)).ok, true, 'justo en el tope se acepta');
    assert.equal(validarMensajeSoporte('a'.repeat(MAX_MENSAJE + 1)).ok, false, 'pasado el tope se rechaza');
}

// --- Texto de WhatsApp ---

{
    const texto = construirMensajeSoporte({
        origen: 'panel',
        negocioNombre: 'Yuly Nails',
        negocioSlug: 'yuly_nails',
        quien: 'Dueña de Yuly Nails',
        contacto: '56370540',
        plataforma: 'APK android',
        mensaje: 'La agenda no carga desde ayer.',
        conFoto: true
    });

    assert.ok(texto.includes('Yuly Nails'), 'el nombre del salon va en el mensaje');
    assert.ok(texto.includes('yuly_nails'), 'el slug va en el mensaje para localizarlo rapido');
    assert.ok(texto.includes('56370540'), 'el telefono de contacto va en el mensaje');
    assert.ok(texto.includes('APK android'), 'la plataforma ayuda a reproducir el fallo');
    assert.ok(texto.includes('La agenda no carga desde ayer.'), 'el problema va tal cual');
    assert.ok(texto.includes('foto'), 'si hay foto se avisa de que viene adjunta');
}

// Sin foto no se menciona ninguna foto (si no, uno la busca y no esta).
{
    const texto = construirMensajeSoporte({ mensaje: 'No entra la clave.', conFoto: false });
    assert.ok(!texto.includes('foto'), 'sin foto no se habla de fotos');
}

// Quien escribe cambia segun la app de la que venga.
{
    assert.ok(construirMensajeSoporte({ origen: 'panel', mensaje: 'x' }).includes('La dueña'));
    assert.ok(construirMensajeSoporte({ origen: 'clientas', mensaje: 'x' }).includes('Una clienta'));
}

// --- URL de wa.me ---

// Siempre apunta al WhatsApp de soporte y lleva el texto codificado.
{
    const url = linkWhatsAppSoporte('hola mundo & compañía');
    assert.ok(url.startsWith('https://wa.me/15154650340?text='), 'va al numero de soporte');
    assert.ok(url.includes('%20') && url.includes('%26'), 'el texto viaja codificado');
}

// El caso que rompio los mensajes de alta: texto larguisimo. Aqui se recorta
// nosotros, avisando, en vez de dejar que WhatsApp lo corte en silencio.
{
    // Acentos a proposito: cada uno ocupa 6 caracteres al codificar (%C3%B1),
    // que es lo que hacia estallar la longitud sin que se notara.
    const largo = construirMensajeSoporte({
        negocioNombre: 'Salón de pruebas',
        mensaje: 'ñ'.repeat(MAX_MENSAJE),
        conFoto: false
    });
    const url = linkWhatsAppSoporte(largo);
    const codificado = url.split('?text=')[1];

    assert.ok(encodeURIComponent(largo).length > MAX_URL_TEXTO, 'el caso de prueba realmente se pasa del tope');
    assert.ok(codificado.length <= MAX_URL_TEXTO, `la URL se queda dentro del tope (${codificado.length})`);
    assert.ok(decodeURIComponent(codificado).includes('recortado'), 'el recorte se avisa en el propio mensaje');
}

// Un mensaje normal NO se recorta.
{
    const normal = construirMensajeSoporte({ negocioNombre: 'Bella Mia', mensaje: 'No me llegan las notificaciones.' });
    const url = linkWhatsAppSoporte(normal);
    assert.ok(!decodeURIComponent(url.split('?text=')[1]).includes('recortado'), 'un mensaje corto llega entero');
}

console.log('✅ tests/soporte.test.js OK');
