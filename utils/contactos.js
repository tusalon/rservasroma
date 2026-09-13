// utils/contactos.js - Elegir clientas de la agenda del teléfono.
//
// Usa la Contact Picker API del navegador (navigator.contacts.select). El
// teléfono NO nos da acceso a la agenda: abre su propio selector, la dueña
// marca a quién quiere y solo eso llega a la app. Ni se guarda la agenda ni
// se sube a ningún sitio.
//
// DÓNDE FUNCIONA (medido: en escritorio no existe, por eso la detección)
//   Chrome/Samsung en Android  -> sí
//   iPhone (cualquier navegador) -> no, Apple no la implementa
//   Escritorio                 -> no
// Por eso el botón se pinta solo si soportaContactos() dice que sí: donde no
// hay, no aparece nada roto ni un botón que no hace nada.

function soportaContactos() {
    return typeof navigator !== 'undefined' &&
        'contacts' in navigator &&
        typeof navigator.contacts?.select === 'function' &&
        typeof window !== 'undefined' &&
        'ContactsManager' in window;
}

// Separa un teléfono de la agenda en código de país + número local.
//
// Se apoya en detectarPaisTelefono (utils/phone-utils.js), que ya sabe qué
// prefijos son válidos y cuántos dígitos lleva cada país. Sin eso, un número
// cubano guardado como "54012345" se leería como Argentina (+54).
//
// El detector se puede inyectar para poder probar esto sin navegador.
function separarContactoTelefono(telefonoCrudo, codigoPaisPorDefecto, detector) {
    const digitos = String(telefonoCrudo || '').replace(/\D/g, '');
    if (!digitos) return null;

    const detectar = detector || (typeof window !== 'undefined' ? window.detectarPaisTelefono : null);
    const pais = detectar ? detectar(digitos) : null;

    // Con prefijo internacional reconocido: se parte por ahí.
    if (pais && pais.codigo && digitos.length > pais.codigo.length) {
        return { codigoPais: String(pais.codigo), local: digitos.slice(String(pais.codigo).length) };
    }

    // Sin prefijo (lo normal en una agenda cubana): es un número local del
    // país que tenga puesto el salón.
    return { codigoPais: String(codigoPaisPorDefecto || '53'), local: digitos };
}

// Limpia lo que devuelve el selector: nombres vacíos, contactos sin teléfono y
// repetidos. Pura a proposito, para poder probarla.
function normalizarContactos(seleccion, codigoPaisPorDefecto, detector) {
    const vistos = new Set();
    return (Array.isArray(seleccion) ? seleccion : []).reduce((lista, contacto) => {
        // La API devuelve arrays: un contacto puede tener varios teléfonos.
        // Se toma el primero, que es el que la persona ve como principal.
        const telefono = Array.isArray(contacto?.tel) ? contacto.tel.find(Boolean) : contacto?.tel;
        const partes = separarContactoTelefono(telefono, codigoPaisPorDefecto, detector);
        if (!partes) return lista;

        const completo = partes.codigoPais + partes.local;
        if (vistos.has(completo)) return lista;
        vistos.add(completo);

        const nombreCrudo = Array.isArray(contacto?.name) ? contacto.name.find(Boolean) : contacto?.name;
        lista.push({
            // Un contacto guardado solo con el número no tiene nombre, y la
            // reserva lo necesita: se usa el número para que se vea algo.
            nombre: String(nombreCrudo || '').trim() || partes.local,
            codigoPais: partes.codigoPais,
            local: partes.local,
            completo
        });
        return lista;
    }, []);
}

// Abre el selector del teléfono. Devuelve [] si se cancela o no hay soporte.
// Tiene que llamarse desde un clic: los navegadores no dejan abrirlo solo.
async function elegirContactos(opciones) {
    if (!soportaContactos()) return [];
    const config = opciones || {};
    try {
        // No todos los teléfonos ofrecen las mismas propiedades: se piden solo
        // las que el aparato dice soportar, o select() falla entero.
        let disponibles = ['name', 'tel'];
        if (typeof navigator.contacts.getProperties === 'function') {
            const soportadas = await navigator.contacts.getProperties();
            disponibles = disponibles.filter(p => soportadas.includes(p));
        }
        if (!disponibles.includes('tel')) return [];

        const seleccion = await navigator.contacts.select(disponibles, { multiple: !!config.multiple });
        return normalizarContactos(seleccion, config.codigoPaisPorDefecto);
    } catch (error) {
        // Cancelar el selector lanza excepción; no es un error que avisar.
        console.warn('Selector de contactos cerrado o no disponible:', error);
        return [];
    }
}

if (typeof window !== 'undefined') {
    window.soportaContactos = soportaContactos;
    window.separarContactoTelefono = separarContactoTelefono;
    window.normalizarContactos = normalizarContactos;
    window.elegirContactos = elegirContactos;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { soportaContactos, separarContactoTelefono, normalizarContactos };
}
