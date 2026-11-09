// Mensajes que la admin puede personalizar para sus clientas:
//   * Confirmacion de la cita (se ve al reservar). Interruptor: mensaje_confirmacion_activo.
//   * Bienvenida de primera vez (se envia por WhatsApp desde el panel "Clientas nuevas").
//     Interruptor: mensaje_primera_vez_activo.
// Apagado = el texto de siempre. Marcas: {cliente} {nombre_negocio} {servicio} {fecha} {hora} {profesional} {direccion}.
// El editor de la confirmacion EMPIEZA con el mensaje de siempre ya escrito (MENSAJE_CONFIRMACION_DEFECTO, con sus
// marcas) y la dueña le añade o le quita lo que quiera. Lo que ella deja es exactamente lo que sale por WhatsApp;
// una linea cuyo dato no existe (sin direccion, sin total...) se salta sola.
//
// "Clienta nueva" = su PRIMERA reserva (sin contar las canceladas), hecha hace poco.
// Cuentas puras: se prueban en tests/bienvenida.test.js.

(function (root) {
    const MARCAS = ['cliente', 'nombre_negocio', 'servicio', 'fecha', 'hora', 'profesional', 'direccion', 'total', 'calendario'];
    // Datos de la cita: si su valor viene vacio, la linea que los lleva se salta.
    const DATOS_CITA = ['servicio', 'fecha', 'hora', 'profesional', 'direccion', 'total', 'calendario'];

    // El mensaje de confirmacion de siempre (el que sale por WhatsApp si la dueña no escribe el suyo).
    const MENSAJE_CONFIRMACION_DEFECTO =
        '✅ *{nombre_negocio} - Cita Confirmada*\n\n' +
        'Hola *{cliente}*, tu cita ha sido agendada.\n\n' +
        '📅 *Fecha:* {fecha}\n' +
        '⏰ *Hora:* {hora}\n' +
        '✨ *Servicio:* {servicio}\n' +
        '👩‍🎨 *Profesional:* {profesional}\n' +
        '💵 *Total a pagar:* {total}\n' +
        '📍 *Dirección:* {direccion}\n' +
        '📅 *Agregar a tu calendario:* {calendario}\n\n' +
        '¡Te esperamos! ❤️';

    // Las lineas que el editor ofrece añadir (botones) cuando la dueña las quitó.
    const LINEAS_DATOS = {
        fecha: '📅 *Fecha:* {fecha}',
        hora: '⏰ *Hora:* {hora}',
        servicio: '✨ *Servicio:* {servicio}',
        profesional: '👩‍🎨 *Profesional:* {profesional}',
        direccion: '📍 *Dirección:* {direccion}',
        total: '💵 *Total a pagar:* {total}',
        calendario: '📅 *Agregar a tu calendario:* {calendario}'
    };

    const limpiaClave = (clave) => clave.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const DIAS_VENTANA = 14;

    const MENSAJE_PRIMERA_VEZ_DEFECTO =
        '¡Hola {cliente}! 💗 Bienvenida a {nombre_negocio}. Nos alegra mucho que hayas reservado con nosotras.\n\n' +
        'Tu cita: {servicio}, {fecha} a las {hora}.\n\n' +
        'Si necesitas cambiar algo o tienes cualquier duda, escríbenos por aquí. ¡Te esperamos!';

    function rellenar(plantilla, datos) {
        const texto = String(plantilla || '').trim();
        if (!texto) return '';
        const valores = datos || {};
        return texto.replace(/\{([^}]+)\}/g, (marca, clave) => {
            // {dirección} y {direccion} valen igual: las dueñas escriben con tilde.
            const limpia = clave.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return MARCAS.includes(limpia) && valores[limpia] != null ? String(valores[limpia]) : marca;
        });
    }

    // Marcas de datos de la cita que hay en una linea.
    function datosDeLinea(linea) {
        const usadas = [];
        String(linea).replace(/\{([^}]+)\}/g, (marca, clave) => {
            const k = limpiaClave(clave);
            if (DATOS_CITA.includes(k)) usadas.push(k);
            return marca;
        });
        return usadas;
    }

    const vacio = (valor) => valor == null || String(valor).trim() === '';
    const juntaHuecos = (texto) => texto.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // Marcas de datos de la cita (fecha, hora, servicio, profesional, direccion) que el texto NO tiene:
    // el editor ofrece botones para volver a ponerlas.
    function faltantes(plantilla) {
        const puestas = new Set();
        String(plantilla || '').split('\n').forEach((l) => datosDeLinea(l).forEach((k) => puestas.add(k)));
        return ['fecha', 'hora', 'servicio', 'profesional', 'direccion'].filter((k) => !puestas.has(k));
    }

    // Texto de la confirmacion con los datos puestos. Una linea cuyo dato no existe se salta (sin
    // direccion guardada, con costos ocultos...), para no dejar "Dirección:" colgando.
    function rellenarConfirmacion(plantilla, datos) {
        const valores = datos || {};
        const lineas = String(plantilla || '').split('\n').filter((linea) =>
            !datosDeLinea(linea).some((k) => vacio(valores[k])));
        return juntaHuecos(rellenar(lineas.join('\n'), valores));
    }

    // Version corta para la pantalla «Cita reservada», que ya enseña el ticket con los datos:
    // solo las lineas sin datos de la cita y sin los asteriscos de WhatsApp.
    function introConfirmacion(plantilla, datos) {
        const lineas = String(plantilla || '').split('\n').filter((linea) => datosDeLinea(linea).length === 0);
        return juntaHuecos(rellenar(lineas.join('\n').replace(/\*/g, ''), datos));
    }

    // Texto personalizado de la confirmacion, o '' si la admin no lo usa (entonces se muestra el de
    // siempre). Es EXACTAMENTE su texto con los datos puestos. opciones.pantalla: solo la parte
    // sin datos, para la pantalla de reserva.
    function textoConfirmacion(config, datos, opciones) {
        if (!config || config.mensaje_confirmacion_activo !== true) return '';
        if (opciones && opciones.pantalla) return introConfirmacion(config.mensaje_confirmacion, datos);
        return rellenarConfirmacion(config.mensaje_confirmacion, datos);
    }

    // El de la admin si lo tiene encendido y escrito; si no, el de RservasRoma.
    function textoPrimeraVez(config, datos) {
        const propio = config && config.mensaje_primera_vez_activo === true
            ? rellenar(config.mensaje_primera_vez, datos)
            : '';
        return propio || rellenar(MENSAJE_PRIMERA_VEZ_DEFECTO, datos);
    }

    const soloDigitos = (valor) => String(valor || '').replace(/\D/g, '');

    // reservas: las reservas NO canceladas de las clientas candidatas (todas, no solo las recientes,
    // para saber si es la primera). clientes: filas de clientes_autorizados (whatsapp, bienvenida_enviada_at).
    // Devuelve las clientas nuevas pendientes de bienvenida, la mas reciente primero.
    function clientasNuevas(reservas, clientes, hoy, dias) {
        const ventana = Number.isFinite(dias) ? dias : DIAS_VENTANA;
        const limite = new Date(`${hoy}T12:00:00`);
        limite.setDate(limite.getDate() - ventana);

        const porClienta = new Map();
        (reservas || []).forEach((reserva) => {
            if (!reserva || reserva.estado === 'Cancelado') return;
            const clave = soloDigitos(reserva.cliente_whatsapp);
            if (!clave) return;
            if (!porClienta.has(clave)) porClienta.set(clave, []);
            porClienta.get(clave).push(reserva);
        });

        const yaSaludadas = new Set(
            (clientes || []).filter((c) => c && c.bienvenida_enviada_at).map((c) => soloDigitos(c.whatsapp))
        );

        const nuevas = [];
        porClienta.forEach((lista, clave) => {
            if (lista.length !== 1 || yaSaludadas.has(clave)) return;
            const reserva = lista[0];
            const creada = new Date(reserva.created_at || `${reserva.fecha}T12:00:00`);
            if (Number.isNaN(creada.getTime()) || creada < limite) return;
            nuevas.push({ whatsapp: reserva.cliente_whatsapp, clave, reserva, creada: creada.getTime() });
        });
        return nuevas.sort((a, b) => b.creada - a.creada);
    }

    const api = { MARCAS, DIAS_VENTANA, MENSAJE_PRIMERA_VEZ_DEFECTO, MENSAJE_CONFIRMACION_DEFECTO, LINEAS_DATOS, rellenar, rellenarConfirmacion, faltantes, textoConfirmacion, textoPrimeraVez, clientasNuevas, soloDigitos };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.bienvenida = api;
})(typeof window !== 'undefined' ? window : globalThis);
