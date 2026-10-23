// utils/turnos.js — Un TURNO es lo que la clienta reservo en una visita: una o varias filas de `reservas`
// seguidas (una por servicio) del mismo dia y estado. Aqui vive todo lo que hace falta para cambiarlo:
// moverlo entero, quitarle un servicio, anadirle uno y buscar huecos para lo que se anade. Lo usan la
// pantalla de la clienta (MyBookings) y el panel de la duena (admin-app).
//
// Dos partes: arriba las cuentas puras (con prueba en tests/turnos.test.js) y abajo lo que habla con
// Supabase. La base sigue siendo la que manda: la restriccion anti doble-reserva y los espacios
// (sql-espacios.sql) rechazan lo que no cabe, y aqui eso se convierte en un mensaje claro.

(function (raiz) {
    'use strict';

    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

    function aMin(hora) {
        const partes = String(hora || '').split(':');
        return (parseInt(partes[0], 10) || 0) * 60 + (parseInt(partes[1], 10) || 0);
    }

    function aHora(minutos) {
        return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    }

    function digitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function normalizar(texto) {
        return String(texto || '').trim().toLowerCase();
    }

    // Minutos que dura una fila: por sus horas, o por `duracion` si no trae hora de fin.
    function duracionDeFila(fila) {
        const inicio = aMin(fila.hora_inicio);
        const porHoras = fila.hora_fin ? aMin(fila.hora_fin) - inicio : 0;
        return porHoras > 0 ? porHoras : (parseInt(fila.duracion, 10) || 60);
    }

    function finDeFila(fila) {
        return aMin(fila.hora_inicio) + duracionDeFila(fila);
    }

    // ---- Agrupar -------------------------------------------------------------------------------------
    // Filas de la misma clienta, dia y estado, una pegada a la otra (la anterior termina cuando empieza la
    // siguiente), forman un turno. Es la misma regla con la que el panel junta las citas en la agenda.
    function resumirTurno(filas) {
        const primera = filas[0];
        const ultima = filas[filas.length - 1];
        const items = [];
        filas.forEach((fila) => {
            const nombres = String(fila.servicio || '').split(' + ').map((nombre) => nombre.trim()).filter(Boolean);
            nombres.forEach((nombre, indice) => items.push({
                filaId: fila.id,
                nombre,
                indice,
                parteDeTexto: nombres.length > 1,
                profesional_nombre: fila.profesional_nombre || fila.trabajador_nombre || '',
                profesional_id: fila.profesional_id
            }));
        });
        const profesionales = [...new Set(filas.map((fila) => fila.profesional_nombre || fila.trabajador_nombre).filter(Boolean))];
        return {
            ...primera,
            _turno: true,
            id: primera.id,
            filas,
            items,
            servicio: filas.map((fila) => fila.servicio).filter(Boolean).join(' + '),
            hora_inicio: primera.hora_inicio,
            hora_fin: aHora(finDeFila(ultima)),
            duracion: filas.reduce((total, fila) => total + duracionDeFila(fila), 0),
            profesional_nombre: profesionales.join(' · ')
        };
    }

    function agruparTurnos(reservas) {
        const ordenadas = (reservas || [])
            .filter((reserva) => reserva && reserva.id != null && reserva.hora_inicio)
            .sort((a, b) =>
                String(a.fecha || '').localeCompare(String(b.fecha || ''))
                || digitos(a.cliente_whatsapp).localeCompare(digitos(b.cliente_whatsapp))
                || aMin(a.hora_inicio) - aMin(b.hora_inicio)
                || String(a.id).localeCompare(String(b.id)));
        const grupos = [];
        ordenadas.forEach((reserva) => {
            const grupo = grupos[grupos.length - 1];
            const anterior = grupo && grupo[grupo.length - 1];
            const seguida = anterior
                && digitos(anterior.cliente_whatsapp) === digitos(reserva.cliente_whatsapp)
                && anterior.fecha === reserva.fecha
                && anterior.estado === reserva.estado
                && finDeFila(anterior) === aMin(reserva.hora_inicio);
            if (seguida) grupo.push(reserva);
            else grupos.push([reserva]);
        });
        return grupos.map(resumirTurno);
    }

    // ---- Mover un turno entero -----------------------------------------------------------------------
    // Cada fila conserva su distancia con la primera y su duracion. Devuelve los cambios en un orden que no
    // hace chocar a la misma profesional consigo misma al guardarlos de uno en uno: si el turno se
    // adelanta/atrasa dentro del mismo dia, se empieza por el lado hacia donde se mueve.
    function planMoverTurno(filas, nuevaFecha, nuevaHora) {
        const orden = [...filas].sort((a, b) => aMin(a.hora_inicio) - aMin(b.hora_inicio));
        const base = aMin(orden[0].hora_inicio);
        const nuevaBase = aMin(nuevaHora);
        const cambios = orden.map((fila) => {
            const inicio = nuevaBase + (aMin(fila.hora_inicio) - base);
            return {
                id: fila.id,
                fecha: nuevaFecha,
                hora_inicio: aHora(inicio),
                hora_fin: aHora(inicio + duracionDeFila(fila)),
                anterior: { fecha: fila.fecha, hora_inicio: fila.hora_inicio, hora_fin: fila.hora_fin }
            };
        });
        const haciaAdelante = nuevaFecha === orden[0].fecha ? nuevaBase > base : nuevaFecha > orden[0].fecha;
        return haciaAdelante ? cambios.reverse() : cambios;
    }

    // ---- Quitar un servicio --------------------------------------------------------------------------
    // `item` sale de turno.items. `duracionPorNombre`: { 'corte': 30 } con la duracion de cada servicio.
    //  - Es el unico servicio del turno:      { tipo: 'cancelarTurno' }
    //  - Tiene su propia fila:                { tipo: 'cancelarFila', fila }
    //  - Va unido a otros en una sola fila:   { tipo: 'editarFila', fila, servicio, duracion, hora_fin }
    //  - Va unido y no se sabe cuanto dura:   { tipo: 'imposible', motivo: 'sin_duracion' }
    function planQuitarServicio(turno, item, duracionPorNombre) {
        if (!turno || !item || !turno.items || turno.items.length <= 1) return { tipo: 'cancelarTurno' };
        const fila = turno.filas.find((candidata) => String(candidata.id) === String(item.filaId));
        if (!fila) return { tipo: 'imposible', motivo: 'sin_fila' };
        if (!item.parteDeTexto) return { tipo: 'cancelarFila', fila };

        const nombres = String(fila.servicio || '').split(' + ').map((nombre) => nombre.trim()).filter(Boolean);
        const restantes = nombres.filter((_, indice) => indice !== item.indice);
        const duracionQuitada = parseInt((duracionPorNombre || {})[normalizar(item.nombre)], 10);
        if (!duracionQuitada) return { tipo: 'imposible', motivo: 'sin_duracion' };
        const duracion = Math.max(5, duracionDeFila(fila) - duracionQuitada);
        return {
            tipo: 'editarFila',
            fila,
            servicio: restantes.join(' + '),
            duracion,
            hora_fin: aHora(aMin(fila.hora_inicio) + duracion)
        };
    }

    // ---- Disponibilidad ------------------------------------------------------------------------------
    // Contexto de UNA profesional en UN dia:
    //   { trabaja, slots: ['09:00', ...], descansos: [{ inicio, fin }], ocupadas: [{ id, hora_inicio, hora_fin }] }
    // `ocupadas` ya trae las citas de otras y los tramos bloqueados por espacios (utils/espacios.js).
    function cabeEnProfesional(contexto, inicio, fin, opciones = {}) {
        if (!contexto || !contexto.trabaja) return false;
        if (fin > 24 * 60) return false;
        if (opciones.exigirSlot && !(contexto.slots || []).includes(aHora(inicio))) return false;
        const choca = (contexto.descansos || []).some((descanso) =>
            descanso && descanso.inicio && descanso.fin && inicio < aMin(descanso.fin) && fin > aMin(descanso.inicio));
        if (choca) return false;
        const ignorar = opciones.ignorar || new Set();
        return !(contexto.ocupadas || []).some((otra) =>
            !ignorar.has(String(otra.id)) && inicio < aMin(otra.hora_fin) && fin > aMin(otra.hora_inicio));
    }

    // Horas de inicio en que cabe el turno ENTERO (cada fila con su profesional).
    // `filas`: [{ profesionalId, offset, dur }] en orden; `contextos`: { [profesionalId]: contexto }.
    // La primera fila empieza en un horario de su profesional; las demas solo piden que ella trabaje ese
    // dia y no choque (igual que cuando se reserva un combo). `permiteInicio(hora)` pone los limites de
    // antelacion y los horarios permitidos del primer servicio.
    function horasLibresTurno({ filas, contextos, ignorarIds, permiteInicio }) {
        if (!filas || !filas.length) return [];
        const ignorar = new Set([...(ignorarIds || [])].map(String));
        const primero = contextos[filas[0].profesionalId];
        const horas = new Set();
        ((primero && primero.slots) || []).forEach((hora) => {
            if (permiteInicio && !permiteInicio(hora)) return;
            const inicio = aMin(hora);
            const cabe = filas.every((fila, indice) => cabeEnProfesional(
                contextos[fila.profesionalId],
                inicio + fila.offset,
                inicio + fila.offset + fila.dur,
                { ignorar, exigirSlot: indice === 0 }
            ));
            if (cabe) horas.add(hora);
        });
        return [...horas].sort();
    }

    // Horas de inicio en que cabe UN servicio de `dur` minutos con esa profesional.
    function huecosParaServicio({ contexto, dur, permiteInicio }) {
        const huecos = [];
        ((contexto && contexto.slots) || []).forEach((hora) => {
            if (permiteInicio && !permiteInicio(hora)) return;
            const inicio = aMin(hora);
            if (cabeEnProfesional(contexto, inicio, inicio + dur, { exigirSlot: true })) huecos.push(hora);
        });
        return huecos;
    }

    // ---- Ordenar las sugerencias para el servicio que se anade ---------------------------------------
    // 1) justo despues de la cita; 2) el mismo dia, lo mas cerca posible; 3) otros dias, los primeros de
    // cada dia. `candidatos`: [{ fecha, hora_inicio, profesional_id }]. Sin limite de tipos se devolverian
    // cientos, asi que cada grupo tiene su tope.
    function clasificarSugerencias(candidatos, { fecha, finMin, profesionalPreferidaId, max = 12 }) {
        const preferida = (c) => (String(c.profesional_id) === String(profesionalPreferidaId) ? 0 : 1);
        const contiguas = [];
        const mismoDia = [];
        const otrosDias = [];
        (candidatos || []).forEach((candidato) => {
            if (candidato.fecha === fecha) {
                if (aMin(candidato.hora_inicio) === finMin) contiguas.push({ ...candidato, tipo: 'contigua' });
                else mismoDia.push({ ...candidato, tipo: 'mismo_dia' });
            } else if (candidato.fecha > fecha) {
                otrosDias.push({ ...candidato, tipo: 'otro_dia' });
            }
        });

        contiguas.sort((a, b) => preferida(a) - preferida(b));
        mismoDia.sort((a, b) =>
            Math.abs(aMin(a.hora_inicio) - finMin) - Math.abs(aMin(b.hora_inicio) - finMin) || preferida(a) - preferida(b));
        otrosDias.sort((a, b) =>
            a.fecha.localeCompare(b.fecha) || preferida(a) - preferida(b) || aMin(a.hora_inicio) - aMin(b.hora_inicio));

        const porDia = {};
        const primerosDeCadaDia = otrosDias.filter((candidato) => {
            porDia[candidato.fecha] = (porDia[candidato.fecha] || 0) + 1;
            return porDia[candidato.fecha] <= 3;
        });

        const elegidas = [];
        const vistas = new Set();
        [[contiguas, 2], [mismoDia, 4], [primerosDeCadaDia, max]].forEach(([lista, tope]) => {
            let tomadas = 0;
            lista.forEach((candidato) => {
                const clave = `${candidato.fecha}|${candidato.hora_inicio}|${candidato.profesional_id}`;
                if (tomadas >= tope || elegidas.length >= max || vistas.has(clave)) return;
                vistas.add(clave);
                elegidas.push(candidato);
                tomadas++;
            });
        });
        return elegidas;
    }

    // ---- Horarios permitidos de cada servicio del turno ----------------------------------------------
    // Al mover el turno entero, TODAS sus filas tienen que caer en una hora que su servicio acepte (cada una
    // con su distancia a la primera), no solo la primera. Devuelve `hora => boolean`. `servicios`: { nombre
    // normalizado: servicio }; `permite(servicio, hora, dia)` es servicioPermiteHorario de utils/timeLogic.js.
    // Una fila con "A + B" (duracion puesta a mano) es un solo bloque: manda el primero.
    function aceptanTodosLosServicios(filasOrdenadas, servicios, fecha, permite) {
        const dia = DIAS[new Date(`${fecha}T12:00:00`).getDay()];
        const base = aMin(filasOrdenadas[0].hora_inicio);
        const partes = filasOrdenadas
            .map((fila) => ({
                servicio: servicios[normalizar(String(fila.servicio || '').split(' + ')[0])],
                offset: aMin(fila.hora_inicio) - base
            }))
            .filter((parte) => parte.servicio);
        return (hora) => partes.every((parte) => permite(parte.servicio, aHora(aMin(hora) + parte.offset), dia));
    }

    const api = {
        aMin, aHora, normalizar, duracionDeFila, agruparTurnos, planMoverTurno, planQuitarServicio,
        cabeEnProfesional, horasLibresTurno, huecosParaServicio, clasificarSugerencias, aceptanTodosLosServicios
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    // ==================================================================================================
    // Lo que sigue habla con Supabase y con el resto de la app. Se prueba con una Supabase simulada.
    // ==================================================================================================
    const t = (texto, datos) => (typeof window.t === 'function' ? window.t(texto, datos) : texto);

    function negocioId() {
        return (typeof window.getNegocioId === 'function' && window.getNegocioId()) || '';
    }

    function cabeceras(extra) {
        return { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`, ...(extra || {}) };
    }

    function fechaLocal(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function sumarDias(fecha, dias) {
        const date = new Date(`${fecha}T12:00:00`);
        date.setDate(date.getDate() + dias);
        return fechaLocal(date);
    }

    function indiceAHora(indice) {
        return `${String(Math.floor(indice / 2)).padStart(2, '0')}:${indice % 2 === 0 ? '00' : '30'}`;
    }

    function errorCon(codigo, mensaje) {
        const error = new Error(mensaje);
        error.code = codigo;
        return error;
    }

    async function serviciosPorNombre() {
        const lista = window.salonServicios ? await window.salonServicios.getAll(false) : [];
        return Object.fromEntries((lista || []).map((servicio) => [normalizar(servicio.nombre), servicio]));
    }

    // Contextos de varias profesionales y varios dias: UN pedido de horarios y UNO de citas por profesional.
    // `profesionales`: [{ id, fechas_libres }]; `servicioDe(profesionalId)`: lo que esa profesional haria
    // (para que los espacios del servicio cuenten).
    async function cargarContextos(profesionales, fechas, servicioDe, ignorarIds, ignorarLibres) {
        const contextos = {};
        if (!fechas.length) return contextos;
        const cerrados = new Set(((await (window.getDiasCerrados ? window.getDiasCerrados() : [])) || []).map((dia) => dia.fecha));
        const desde = fechas[0];
        const hasta = fechas[fechas.length - 1];

        await Promise.all(profesionales.map(async (profesional) => {
            const [horariosPorFecha, respuesta] = await Promise.all([
                window.salonConfig.getHorariosProfesionalParaFechas(profesional.id, fechas),
                fetch(`${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId()}&profesional_id=eq.${profesional.id}&fecha=gte.${desde}&fecha=lte.${hasta}&estado=neq.Cancelado&select=id,fecha,hora_inicio,hora_fin`,
                    { headers: cabeceras(), cache: 'no-store' })
            ]);
            const propias = respuesta.ok ? await respuesta.json() : [];
            const todas = (await (window.espacios ? window.espacios.reservasConEspacios(profesional.id, desde, hasta, propias, ignorarIds && ignorarIds.length ? ignorarIds : null, servicioDe(profesional.id)) : propias)) || propias;
            const porFecha = {};
            todas.forEach((reserva) => { (porFecha[reserva.fecha] = porFecha[reserva.fecha] || []).push(reserva); });

            contextos[profesional.id] = {};
            fechas.forEach((fecha) => {
                const horario = horariosPorFecha[fecha] || {};
                const dia = DIAS[new Date(`${fecha}T12:00:00`).getDay()];
                const indices = (horario.horariosPorDia && horario.horariosPorDia[dia]) || [];
                const libre = !ignorarLibres && ((profesional.fechas_libres || []).includes(fecha) || cerrados.has(fecha));
                contextos[profesional.id][fecha] = {
                    trabaja: !libre && indices.length > 0,
                    slots: libre ? [] : indices.map(indiceAHora),
                    descansos: (horario.descansosPorDia && horario.descansosPorDia[dia]) || [],
                    ocupadas: porFecha[fecha] || []
                };
            });
        }));
        return contextos;
    }

    async function profesionalesPorIds(ids) {
        if (!ids.length) return [];
        const respuesta = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId()}&id=in.(${ids.join(',')})&select=id,nombre,fechas_libres`,
            { headers: cabeceras() });
        return respuesta.ok ? await respuesta.json() : [];
    }

    // Reglas de antelacion como las de reservar: no antes de ahora + minimo de horas. La duena no las tiene.
    function reglasDeAntelacion(config, esAdmin, servicioPrimero, fecha, servicios) {
        const minHoras = Number(config?.min_antelacion_horas ?? 2);
        const minimo = esAdmin ? null : new Date(Date.now() + minHoras * 3600000);
        const dia = DIAS[new Date(`${fecha}T12:00:00`).getDay()];
        const servicio = servicioPrimero ? servicios[normalizar(servicioPrimero)] : null;
        return (hora) => {
            if (minimo) {
                const [h, m] = hora.split(':').map(Number);
                const [y, mo, d] = fecha.split('-').map(Number);
                if (new Date(y, mo - 1, d, h, m) < minimo) return false;
            }
            if (servicio && typeof window.servicioRestringeHorarios === 'function' && window.servicioRestringeHorarios(servicio, dia)) {
                return window.servicioPermiteHorario(servicio, hora, dia);
            }
            return true;
        };
    }

    // Horas en que cabe el turno entero en `fecha`. Devuelve { horas, mensaje }.
    async function horasLibresParaTurno(turno, fecha, { esAdmin = false } = {}) {
        if (!turno || !fecha) return { horas: [], mensaje: '' };
        const hoy = fechaLocal(new Date());
        if (fecha < hoy) return { horas: [], mensaje: '' };

        const config = window.salonConfig ? await window.salonConfig.get() : {};
        const maxDias = Number(config?.max_antelacion_dias ?? 30);
        if (!esAdmin && maxDias > 0 && Math.round((new Date(`${fecha}T12:00:00`) - new Date(`${hoy}T12:00:00`)) / 86400000) > maxDias) {
            return { horas: [], mensaje: t('Solo puedes reservar con hasta {dias} días de anticipación.', { dias: maxDias }) };
        }

        const ordenadas = [...turno.filas].sort((a, b) => aMin(a.hora_inicio) - aMin(b.hora_inicio));
        const profesionales = await profesionalesPorIds([...new Set(ordenadas.map((fila) => fila.profesional_id))]);
        const cerrados = (await (window.getDiasCerrados ? window.getDiasCerrados() : [])) || [];
        if (!esAdmin && cerrados.some((dia) => dia.fecha === fecha)) return { horas: [], mensaje: t('Ese día está cerrado para reservas.') };
        if (!esAdmin && profesionales.some((profesional) => (profesional.fechas_libres || []).includes(fecha))) {
            return { horas: [], mensaje: t('La profesional tiene ese día marcado como libre.') };
        }

        const servicioDe = (profesionalId) => ordenadas
            .filter((fila) => String(fila.profesional_id) === String(profesionalId)).map((fila) => fila.servicio).join(' + ');
        const contextosPorProfesional = await cargarContextos(profesionales, [fecha], servicioDe, ordenadas.map((fila) => fila.id), esAdmin);
        const contextos = Object.fromEntries(Object.entries(contextosPorProfesional).map(([id, dias]) => [id, dias[fecha]]));

        const base = aMin(ordenadas[0].hora_inicio);
        const servicios = await serviciosPorNombre();
        const primerNombre = String(ordenadas[0].servicio || '').split(' + ')[0];
        const antelacion = reglasDeAntelacion(config, esAdmin, primerNombre, fecha, servicios);
        const aceptanServicios = typeof window.servicioPermiteHorario === 'function'
            ? aceptanTodosLosServicios(ordenadas, servicios, fecha, window.servicioPermiteHorario)
            : () => true;
        const horas = horasLibresTurno({
            filas: ordenadas.map((fila) => ({ profesionalId: fila.profesional_id, offset: aMin(fila.hora_inicio) - base, dur: duracionDeFila(fila) })),
            contextos,
            ignorarIds: ordenadas.map((fila) => fila.id),
            permiteInicio: (hora) => antelacion(hora) && aceptanServicios(hora)
        });
        return { horas, mensaje: horas.length ? '' : t('No hay horarios disponibles para esa fecha.') };
    }

    async function patchFila(id, cambios) {
        const enviar = async (cuerpo) => fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId()}&id=eq.${id}`,
            { method: 'PATCH', headers: cabeceras({ 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify(cuerpo) });
        let respuesta = await enviar(cambios);
        // Los avisos de recordatorio viven en columnas de otro SQL: si no existen, se guarda igual sin ellas.
        if (!respuesta.ok && respuesta.status === 400 && 'push_recordatorio_dia_enviado' in cambios) {
            const { recordatorio_1h_enviado, push_recordatorio_dia_enviado, push_recordatorio_hora_enviado, ...sinAvisos } = cambios;
            respuesta = await enviar(sinAvisos);
        }
        if (!respuesta.ok) {
            const texto = await respuesta.text().catch(() => '');
            if (respuesta.status === 409 || /23P01|23505/.test(texto)) {
                throw errorCon('HORARIO_OCUPADO', t('Ese horario acaba de ser tomado por otra persona. Elige otro horario.'));
            }
            throw errorCon('ERROR_GUARDAR', t('No se pudo guardar el cambio. Intenta de nuevo.'));
        }
        const filas = await respuesta.json();
        return Array.isArray(filas) ? filas[0] : filas;
    }

    // Que la clienta vuelva a recibir sus recordatorios para la nueva fecha.
    const REINICIAR_AVISOS = { recordatorio_1h_enviado: false, push_recordatorio_dia_enviado: false, push_recordatorio_hora_enviado: false };

    // Mueve el turno entero. Si una fila falla, deja las que ya se movieron como estaban.
    async function moverTurno(turno, fecha, hora) {
        const cambios = planMoverTurno(turno.filas, fecha, hora);
        const hechos = [];
        try {
            for (const cambio of cambios) {
                const fila = await patchFila(cambio.id, {
                    fecha: cambio.fecha, hora_inicio: cambio.hora_inicio, hora_fin: cambio.hora_fin, ...REINICIAR_AVISOS
                });
                hechos.push({ cambio, fila });
            }
        } catch (error) {
            for (const { cambio } of hechos.reverse()) {
                try { await patchFila(cambio.id, { ...cambio.anterior, ...REINICIAR_AVISOS }); } catch (e) { console.error('No se pudo deshacer el cambio de la reserva', cambio.id, e); }
            }
            throw error;
        }
        // Los horarios viejos quedan libres: que la lista de espera se entere.
        for (const cambio of cambios) {
            const original = turno.filas.find((candidata) => candidata.id === cambio.id);
            try { await (window.notificarListaEsperaTurnoLiberado && window.notificarListaEsperaTurnoLiberado(original)); } catch (e) { /* no frena el cambio */ }
        }
        return hechos.map(({ fila }) => fila);
    }

    async function marcarCancelada(fila, cancelado_por) {
        const cancelada = await patchFila(fila.id, { estado: 'Cancelado' });
        try { await (window.notificarListaEsperaTurnoLiberado && window.notificarListaEsperaTurnoLiberado({ ...fila, cancelado_por })); } catch (e) { /* no frena */ }
        return cancelada;
    }

    // Quita un servicio del turno. Devuelve el plan que se aplico (para avisar y para volver a pintar).
    async function quitarServicio(turno, item, { esAdmin = false } = {}) {
        const servicios = await serviciosPorNombre();
        const duraciones = Object.fromEntries(Object.entries(servicios).map(([nombre, servicio]) => [nombre, servicio.duracion]));
        const plan = planQuitarServicio(turno, item, duraciones);
        if (plan.tipo === 'imposible') throw errorCon('NO_SE_PUEDE_QUITAR', t('No se pudo quitar este servicio desde aquí. Escribe al salón.'));
        if (plan.tipo === 'cancelarTurno') {
            for (const fila of turno.filas) await marcarCancelada(fila, esAdmin ? 'admin' : 'cliente');
        } else if (plan.tipo === 'cancelarFila') {
            await marcarCancelada(plan.fila, esAdmin ? 'admin' : 'cliente');
        } else {
            await patchFila(plan.fila.id, { servicio: plan.servicio, duracion: plan.duracion, hora_fin: plan.hora_fin });
            try { await (window.notificarListaEsperaTurnoLiberado && window.notificarListaEsperaTurnoLiberado(plan.fila)); } catch (e) { /* no frena */ }
        }
        return plan;
    }

    // Busca donde poner el servicio que se anade. Devuelve { sugerencias, mensaje }.
    async function sugerirParaServicio(turno, servicio, { esAdmin = false } = {}) {
        const hoy = fechaLocal(new Date());
        const config = window.salonConfig ? await window.salonConfig.get() : {};
        const maxConfig = Number(config?.max_antelacion_dias ?? 30);
        const dias = Math.min(14, esAdmin || maxConfig <= 0 ? 14 : maxConfig);
        const desde = turno.fecha < hoy ? hoy : turno.fecha;
        const fechas = Array.from({ length: dias + 1 }, (_, i) => sumarDias(desde, i));

        const candidatas = ((await (window.getProfesionalesPorServicio ? window.getProfesionalesPorServicio(servicio.id) : [])) || []).filter((p) => p && p.activo !== false);
        if (!candidatas.length) return { sugerencias: [], mensaje: t('No hay profesionales para este servicio.') };
        const profesionales = candidatas.map((p) => ({ id: p.id, nombre: p.nombre, fechas_libres: p.fechas_libres || [] }));

        const contextos = await cargarContextos(profesionales, fechas, () => servicio.nombre, null, esAdmin);
        const servicios = await serviciosPorNombre();
        const dur = parseInt(servicio.duracion, 10) || 60;
        const candidatos = [];
        fechas.forEach((fecha) => {
            const permiteInicio = reglasDeAntelacion(config, esAdmin, servicio.nombre, fecha, servicios);
            profesionales.forEach((profesional) => {
                huecosParaServicio({ contexto: contextos[profesional.id][fecha], dur, permiteInicio }).forEach((hora) => candidatos.push({
                    fecha, hora_inicio: hora, hora_fin: aHora(aMin(hora) + dur), profesional_id: profesional.id, profesional_nombre: profesional.nombre
                }));
            });
        });

        const usadas = new Set(turno.filas.map((fila) => String(fila.profesional_id)));
        const preferida = profesionales.find((profesional) => usadas.has(String(profesional.id)));
        const sugerencias = clasificarSugerencias(candidatos, {
            fecha: turno.fecha, finMin: aMin(turno.hora_fin), profesionalPreferidaId: preferida && preferida.id
        });
        return { sugerencias, mensaje: sugerencias.length ? '' : t('No encontramos horarios libres en los próximos días. Escribe al salón.') };
    }

    // Crea la fila del servicio anadido, con el mismo estado del turno (si ya mando el anticipo, no se pide otro).
    async function anadirServicio(turno, servicio, sugerencia, { esAdmin = false } = {}) {
        const base = turno.filas[0];
        if (!esAdmin && typeof window.getClienteBloqueado === 'function' && await window.getClienteBloqueado(base.cliente_whatsapp)) {
            throw errorCon('CLIENTE_BLOQUEADO', t('Este cliente no tiene permiso para reservar.'));
        }
        const dur = parseInt(servicio.duracion, 10) || 60;
        const respuesta = await fetch(`${window.SUPABASE_URL}/rest/v1/reservas`, {
            method: 'POST',
            headers: cabeceras({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
            body: JSON.stringify({
                negocio_id: negocioId(),
                cliente_nombre: base.cliente_nombre,
                cliente_whatsapp: base.cliente_whatsapp,
                servicio: servicio.nombre,
                duracion: dur,
                profesional_id: sugerencia.profesional_id,
                profesional_nombre: sugerencia.profesional_nombre,
                fecha: sugerencia.fecha,
                hora_inicio: sugerencia.hora_inicio,
                hora_fin: sugerencia.hora_fin || aHora(aMin(sugerencia.hora_inicio) + dur),
                estado: turno.estado
            })
        });
        if (!respuesta.ok) {
            const texto = await respuesta.text().catch(() => '');
            if (respuesta.status === 409 || /23P01|23505/.test(texto)) {
                throw errorCon('HORARIO_OCUPADO', t('Ese horario acaba de ser tomado por otra persona. Elige otro horario.'));
            }
            throw errorCon('ERROR_GUARDAR', t('No se pudo añadir el servicio. Intenta de nuevo.'));
        }
        const filas = await respuesta.json();
        return Array.isArray(filas) ? filas[0] : filas;
    }

    // Aviso al salon de lo que cambio la clienta (o la duena). Mismo canal que reprogramar.
    async function avisarCambio(titulo, lineas, turno) {
        try {
            const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
            const mensaje = `${titulo.toUpperCase()} - ${config?.nombre || 'Salón'}\n\nCliente: ${turno.cliente_nombre}\nWhatsApp: ${turno.cliente_whatsapp}\n${lineas.join('\n')}`;
            if (window.enviarNotificacionPush) {
                await window.enviarNotificacionPush(`${config?.nombre || 'Salón'} - ${titulo}`, mensaje, 'calendar', 'default', { profesionalId: turno.profesional_id });
            }
        } catch (error) { console.warn('No se pudo avisar al salón del cambio:', error); }
    }

    window.__I18N_EN__ = window.__I18N_EN__ || {};
    Object.assign(window.__I18N_EN__, {
        'Tu turno': 'Your appointment',
        'Quitar': 'Remove',
        '¿Quitar este servicio?': 'Remove this service?',
        'Sí, quitar': 'Yes, remove',
        'Servicio quitado de tu turno.': 'Service removed from your appointment.',
        'No se pudo quitar el servicio. Intenta de nuevo.': 'The service could not be removed. Try again.',
        'No se pudo quitar este servicio desde aquí. Escribe al salón.': 'This service cannot be removed from here. Message the salon.',
        'Tampoco se puede cambiar la fecha ni los servicios.': 'The date and services can no longer be changed either.',
        'Ya no se puede cambiar este turno desde la app. Escribe al salón.': 'This appointment can no longer be changed from the app. Message the salon.',
        'Añadir un servicio': 'Add a service',
        'Elige el servicio que quieres añadir a tu turno.': 'Choose the service you want to add to your appointment.',
        'No hay más servicios para añadir.': 'There are no more services to add.',
        'Cambiar': 'Change',
        'Buscando horarios...': 'Looking for times...',
        'No encontramos horarios libres en los próximos días. Escribe al salón.': 'We found no free times in the coming days. Message the salon.',
        'Justo después de tu cita': 'Right after your appointment',
        'Justo después de la cita': 'Right after the appointment',
        'Elige el servicio que quieres añadir a este turno.': 'Choose the service you want to add to this appointment.',
        'Ese mismo día': 'The same day',
        'Otros días': 'Other days',
        'Añadir este servicio': 'Add this service',
        'Servicio añadido a tu turno.': 'Service added to your appointment.',
        'No se pudo añadir el servicio. Intenta de nuevo.': 'The service could not be added. Try again.',
        'Se mueve todo tu turno, con sus {n} servicios. Los servicios y las profesionales se mantienen igual.': 'Your whole appointment moves, with its {n} services. The services and professionals stay the same.',
        'No hay profesionales para este servicio.': 'There are no professionals for this service.',
        'No se pudo guardar el cambio. Intenta de nuevo.': 'The change could not be saved. Try again.',
        'Ese horario acaba de ser tomado por otra persona. Elige otro horario.': 'That time was just taken by someone else. Choose another time.',
        'Este cliente no tiene permiso para reservar.': 'This client is not allowed to book.',
        'Editar cita': 'Edit appointment',
        'Servicios de este turno': 'Services in this appointment',
        'Al cambiar la fecha u hora se mueve todo el turno, con sus servicios.': 'Changing the date or time moves the whole appointment, with its services.',
        'Cambios guardados.': 'Changes saved.',
        'Servicio añadido.': 'Service added.',
        'Servicio quitado.': 'Service removed.',
        '¿Quitar este servicio del turno?': 'Remove this service from the appointment?',
        'Los datos de la clienta no se cambian desde aquí.': 'The client details cannot be changed from here.',
        'No se pudieron guardar los cambios: {error}': 'The changes could not be saved: {error}',
        'Solo puedes editar tus propias reservas.': 'You can only edit your own bookings.',
        'Atiende: {nombre}': 'Handled by: {nombre}'
    });

    raiz.turnos = {
        ...api, horasLibresParaTurno, moverTurno, quitarServicio, sugerirParaServicio, anadirServicio, avisarCambio,
        patchFila, reiniciarAvisos: REINICIAR_AVISOS
    };
})(typeof window !== 'undefined' ? window : globalThis);
