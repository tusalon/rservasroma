// utils/clientes-conocidos.js
// Reconocer a una clienta por su teléfono mientras la dueña escribe una
// reserva a mano, para no tener que teclear el nombre otra vez.
//
// POR QUÉ ASÍ
// No consulta nada: se arma con las reservas que el panel YA tiene cargadas.
// Una salonera con 600 turnos no necesita otra consulta a la base para saber
// que el 54012345 es Yamila; esa información ya está en pantalla.
//
// El teléfono se compara NORMALIZADO (mismo normalizador que usa el resto del
// panel), porque el mismo número está guardado de formas distintas según cómo
// se creó la reserva: "5401 2345", "+53 54012345", "5354012345".

// Devuelve { telefonoNormalizado: { nombre, turnos, ultima } }.
function indexarClientesConocidos(reservas, normalizar) {
    const norm = typeof normalizar === 'function'
        ? normalizar
        : (valor) => String(valor || '').replace(/\D/g, '');

    const indice = {};
    (Array.isArray(reservas) ? reservas : []).forEach(reserva => {
        const clave = norm(reserva?.cliente_whatsapp);
        if (!clave) return;

        const nombre = String(reserva?.cliente_nombre || '').trim();
        if (!nombre) return;

        // Se ordena por fecha+hora como texto: el formato es YYYY-MM-DD HH:MM,
        // que se compara bien en orden alfabético.
        const cuando = `${reserva?.fecha || ''} ${reserva?.hora_inicio || ''}`;
        const previo = indice[clave];

        if (!previo) {
            indice[clave] = { nombre, turnos: 1, ultima: cuando };
            return;
        }

        previo.turnos += 1;
        // Gana el nombre más reciente: si la dueña lo escribió mal la primera
        // vez y lo corrigió después, vale la corrección, no el error.
        if (cuando > previo.ultima) {
            previo.nombre = nombre;
            previo.ultima = cuando;
        }
    });

    return indice;
}

// Busca por teléfono. Devuelve null si no la conoce.
function buscarClienteConocido(indice, telefono, normalizar) {
    if (!indice) return null;
    const norm = typeof normalizar === 'function'
        ? normalizar
        : (valor) => String(valor || '').replace(/\D/g, '');
    const clave = norm(telefono);
    // Un teléfono a medio escribir no puede reconocer a nadie: con 2 dígitos
    // saltaría cualquiera. Se espera a que haya algo parecido a un número.
    if (!clave || clave.length < 6) return null;
    return indice[clave] || null;
}

if (typeof window !== 'undefined') {
    window.indexarClientesConocidos = indexarClientesConocidos;
    window.buscarClienteConocido = buscarClienteConocido;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { indexarClientesConocidos, buscarClienteConocido };
}
