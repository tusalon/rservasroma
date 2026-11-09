// Mensajes que la admin puede personalizar para sus clientas:
//   * Confirmacion de la cita (se ve al reservar). Interruptor: mensaje_confirmacion_activo.
//   * Bienvenida de primera vez (se envia por WhatsApp desde el panel "Clientas nuevas").
//     Interruptor: mensaje_primera_vez_activo.
// Apagado = el texto de siempre. Marcas: {cliente} {nombre_negocio} {servicio} {fecha} {hora} {profesional} {direccion}.
// El mensaje propio de confirmacion va PRIMERO y los datos de la cita (fecha, hora, servicio, profesional,
// direccion) se añaden solos debajo, salvo los que ella ya puso con su marca.
//
// "Clienta nueva" = su PRIMERA reserva (sin contar las canceladas), hecha hace poco.
// Cuentas puras: se prueban en tests/bienvenida.test.js.

(function (root) {
    const MARCAS = ['cliente', 'nombre_negocio', 'servicio', 'fecha', 'hora', 'profesional', 'direccion'];
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

    // Datos de la cita que SIEMPRE llegan a la clienta aunque la dueña cambie el mensaje.
    // Si ella ya los puso con su marca ({servicio}, {fecha}...), no se repiten.
    const DETALLES = [
        ['fecha', '📅 *Fecha:*'],
        ['hora', '⏰ *Hora:*'],
        ['servicio', '✨ *Servicio:*'],
        ['profesional', '👩‍🎨 *Profesional:*'],
        ['direccion', '📍 *Dirección:*']
    ];

    function marcasUsadas(plantilla) {
        const usadas = new Set();
        String(plantilla || '').replace(/\{([^}]+)\}/g, (marca, clave) => {
            usadas.add(clave.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
            return marca;
        });
        return usadas;
    }

    // Lineas con los datos de la cita que el texto de la dueña no menciona.
    function lineasDetalle(plantilla, datos) {
        const usadas = marcasUsadas(plantilla);
        const valores = datos || {};
        return DETALLES
            .filter(([clave]) => !usadas.has(clave) && String(valores[clave] == null ? '' : valores[clave]).trim() !== '')
            .map(([clave, etiqueta]) => `${etiqueta} ${valores[clave]}`);
    }

    // Texto personalizado de la confirmacion, o '' si la admin no lo usa (entonces se
    // muestra el de siempre). Su mensaje va primero y debajo se añaden solos los datos de la
    // cita que ella no puso. opciones.detalle === false: solo su texto (la pantalla de
    // confirmacion ya enseña el ticket con los datos).
    function textoConfirmacion(config, datos, opciones) {
        if (!config || config.mensaje_confirmacion_activo !== true) return '';
        const texto = rellenar(config.mensaje_confirmacion, datos);
        if (!texto || (opciones && opciones.detalle === false)) return texto;
        const lineas = lineasDetalle(config.mensaje_confirmacion, datos);
        return lineas.length ? `${texto}\n\n${lineas.join('\n')}` : texto;
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

    const api = { MARCAS, DIAS_VENTANA, MENSAJE_PRIMERA_VEZ_DEFECTO, rellenar, lineasDetalle, textoConfirmacion, textoPrimeraVez, clientasNuevas, soloDigitos };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.bienvenida = api;
})(typeof window !== 'undefined' ? window : globalThis);
