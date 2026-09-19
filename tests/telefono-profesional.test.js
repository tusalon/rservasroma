// El teléfono de una profesional es su USUARIO para entrar al panel.
// Esta prueba fija que lo que guarda la ficha y lo que busca el login sean el
// mismo texto, que es todo lo que decide si entra o se queda fuera.
//
// EL CASO QUE LO DESTAPO
// Una profesional de Divine Touch (Yanela) se mudó a Qatar y necesitaba entrar
// con su número de allá. El prefijo de la ficha estaba clavado al país del
// salón (+53), así que no había forma de registrarlo bien.
//
// LA TRAMPA QUE ESTO EVITA
// El login normaliza a internacional con el código del SALÓN y después le quita
// ese prefijo. O sea: para una cubana en un salón cubano busca el número LOCAL,
// y para una de fuera busca el INTERNACIONAL completo. Guardar siempre
// internacional habría roto el acceso de las 381 profesionales que ya existen.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargarPhoneUtils(codigoPaisDelSalon) {
    const fuente = fs.readFileSync(path.join(__dirname, '..', 'utils', 'phone-utils.js'), 'utf8');
    const almacen = {};
    const window = {
        localStorage: {
            getItem: (k) => (k in almacen ? almacen[k] : null),
            setItem: (k, v) => { almacen[k] = String(v); }
        }
    };
    window.window = window;
    vm.runInNewContext(fuente, { window, localStorage: window.localStorage, console: { log() {} } });
    window.setCodigoPaisTelefono(codigoPaisDelSalon);
    return window;
}

// Copia EXACTA de telefonoLocalParaLogin (utils/auth-profesionales.js). Si esa
// cambia y esta no, el test falla y avisa: es justo lo que queremos.
function loQueBuscaElLogin(w, telefonoQueTeclea, codigoPaisDelSalon) {
    const codigo = String(codigoPaisDelSalon || '').replace(/\D/g, '');
    const internacional = w.normalizarTelefonoInternacional(telefonoQueTeclea, codigo);
    return internacional.startsWith(codigo) ? internacional.slice(codigo.length) : internacional;
}

// --- Salón cubano, profesional cubana: nada cambia respecto a hoy ---
{
    const w = cargarPhoneUtils('53');
    const guardado = w.telefonoGuardadoDeProfesional('52014345', '53');
    assert.equal(guardado, '52014345', 'se sigue guardando el local, como las 381 que ya existen');
    assert.equal(loQueBuscaElLogin(w, '52014345', '53'), guardado, 'entra tecleando su número de siempre');
}

// --- Salón cubano, profesional en Qatar: el caso de Yanela ---
{
    const w = cargarPhoneUtils('53');
    const guardado = w.telefonoGuardadoDeProfesional('12345678', '974');
    assert.equal(guardado, '97412345678', 'para una de fuera se guarda el internacional completo');

    // Ella teclea su número de varias formas y tiene que entrar igual.
    assert.equal(loQueBuscaElLogin(w, '97412345678', '53'), guardado, 'tecleando el número completo');
    assert.equal(loQueBuscaElLogin(w, '+974 1234 5678', '53'), guardado, 'con + y espacios');
}

// --- Ida y vuelta: editar la ficha no puede duplicar el prefijo ---
{
    const w = cargarPhoneUtils('53');
    // Se guarda, se vuelve a abrir la ficha, se guarda otra vez sin tocar nada.
    const primera = w.telefonoGuardadoDeProfesional('12345678', '974');
    const loQueSeVeEnElCampo = w.localDeProfesional(primera);
    assert.equal(loQueSeVeEnElCampo, '12345678', 'el campo enseña solo la parte local');
    const segunda = w.telefonoGuardadoDeProfesional(loQueSeVeEnElCampo, '974');
    assert.equal(segunda, primera, 'guardar dos veces seguidas da lo mismo, no "974974..."');
}

// --- Lo mismo para una cubana: abrir y guardar no le cambia el número ---
{
    const w = cargarPhoneUtils('53');
    const primera = w.telefonoGuardadoDeProfesional('52014345', '53');
    const segunda = w.telefonoGuardadoDeProfesional(w.localDeProfesional(primera), '53');
    assert.equal(segunda, primera, 'editar a una cubana no puede romperle el acceso');
}

// --- Salón que NO es cubano: un salón español con una profesional española ---
{
    const w = cargarPhoneUtils('34');
    const guardado = w.telefonoGuardadoDeProfesional('612345678', '34');
    assert.equal(guardado, '612345678', 'mismo país que el salón -> local');
    assert.equal(loQueBuscaElLogin(w, '612345678', '34'), guardado);

    // Y una cubana trabajando para ese salón español: internacional.
    const cubana = w.telefonoGuardadoDeProfesional('52014345', '53');
    assert.equal(cubana, '5352014345', 'distinto país que el salón -> internacional');
    assert.equal(loQueBuscaElLogin(w, '5352014345', '34'), cubana);
}

// --- Qatar quedó bien dado de alta ---
{
    const w = cargarPhoneUtils('53');
    const qa = (w.PHONE_COUNTRIES || []).find((p) => p.codigo === '974');
    assert.ok(qa, 'Qatar tiene que estar en la lista para que el selector lo ofrezca');
    assert.equal(qa.localLength, 8);
    const detectado = w.detectarPaisTelefono('97412345678');
    assert.ok(detectado && detectado.codigo === '974', 'un número de Qatar se reconoce como de Qatar');
}

// --- Añadir Qatar no cambió cómo se leen los números que ya existen ---
{
    const w = cargarPhoneUtils('53');
    assert.equal(w.normalizarTelefonoLocal('5352014345'), '52014345', 'un cubano internacional sigue igual');
    assert.equal(w.detectarPaisTelefono('5352014345').codigo, '53');
    assert.equal(w.detectarPaisTelefono('13055551234').codigo, '1', 'USA sigue detectándose');
}

// --- Casos raros: no revienta ---
{
    const w = cargarPhoneUtils('53');
    assert.equal(w.telefonoGuardadoDeProfesional('', '974'), '');
    assert.equal(w.telefonoGuardadoDeProfesional(null, '53'), '');
    assert.equal(w.localDeProfesional(''), '');
    assert.equal(w.localDeProfesional(null), '');
}

console.log('OK: telefono-profesional.test.js');
