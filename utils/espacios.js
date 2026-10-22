// utils/espacios.js — Espacios del salon (sillas, cabinas, puestos). Opcional por salon.
//
// Cada profesional puede usar ciertos espacios (ej.: Juana 1 y 2, Roma 2 y 3, Sofia 1, 2 y 3).
// Una cita ocupa UN espacio mientras dura. Si todos los espacios de la profesional estan
// tomados por otras citas, ese horario no se ofrece, aunque ella este libre.
//
// Quien asigna el espacio es la base de datos (sql-espacios.sql): al guardar una cita toma el
// primer espacio libre de la profesional y no se mueve. Aqui solo se hace lo que ve la
// pantalla: convertir "todos sus espacios estan ocupados" en tramos bloqueados, para que los
// calendarios y los horarios existentes los traten como cualquier otra cita sin cambiar su logica.
// Con la prueba en tests/espacios.test.js.

(function (raiz) {
    'use strict';

    function aMinutos(hora) {
        const partes = String(hora || '').split(':');
        return (parseInt(partes[0], 10) || 0) * 60 + (parseInt(partes[1], 10) || 0);
    }

    function aHora(minutos) {
        return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}:00`;
    }

    function estaActivo(config) {
        return !!(config && config.espacios_activos) && (parseInt(config.espacios_cantidad, 10) || 0) > 0;
    }

    // Espacios validos de una profesional: enteros de 1 a `cantidad`, sin repetir, ordenados.
    function espaciosDe(profesional, cantidad) {
        const lista = Array.isArray(profesional?.espacios) ? profesional.espacios : [];
        const max = parseInt(cantidad, 10) || 0;
        return [...new Set(lista.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= max))].sort((a, b) => a - b);
    }

    // Tramos en que TODOS los espacios de la profesional estan tomados por citas de otras.
    // `reservasSalon`: citas activas del salon con { fecha, hora_inicio, hora_fin, profesional_id, espacio }.
    // `excluirId`: una cita (o una lista de ellas) que se esta moviendo, para que su propio espacio no la bloquee.
    // Devuelve citas "virtuales" con la misma forma que las reales, listas para sumarlas a las suyas.
    function bloqueosPorEspacios(profesionalId, espaciosProf, reservasSalon, excluirId) {
        if (!espaciosProf || !espaciosProf.length) return [];
        const mios = new Set(espaciosProf);
        const excluidas = excluirId == null ? [] : (Array.isArray(excluirId) ? excluirId : [excluirId]).map(String);
        const porFecha = {};
        (reservasSalon || []).forEach(r => {
            if (r.espacio == null || !mios.has(Number(r.espacio))) return;
            if (String(r.profesional_id) === String(profesionalId)) return;
            if (excluidas.includes(String(r.id))) return;
            const ini = aMinutos(r.hora_inicio);
            const fin = aMinutos(r.hora_fin);
            if (fin <= ini) return;
            (porFecha[r.fecha] = porFecha[r.fecha] || []).push({ ini, fin, espacio: Number(r.espacio) });
        });

        const bloqueos = [];
        Object.keys(porFecha).sort().forEach(fecha => {
            const citas = porFecha[fecha];
            const cortes = [...new Set(citas.flatMap(c => [c.ini, c.fin]))].sort((a, b) => a - b);
            let abierto = null;
            for (let i = 0; i < cortes.length - 1; i++) {
                const a = cortes[i];
                const b = cortes[i + 1];
                const usados = new Set(citas.filter(c => c.ini < b && c.fin > a).map(c => c.espacio));
                const lleno = espaciosProf.every(e => usados.has(e));
                if (lleno && abierto && abierto.fin === a) abierto.fin = b;
                else if (lleno) {
                    abierto = { ini: a, fin: b };
                    bloqueos.push({ fecha, abierto });
                } else abierto = null;
            }
        });

        return bloqueos.map(({ fecha, abierto }) => ({
            id: null,
            fecha,
            hora_inicio: aHora(abierto.ini),
            hora_fin: aHora(abierto.fin),
            profesional_id: profesionalId,
            estado: 'Bloqueado',
            cliente_nombre: 'Espacios ocupados',
            servicio: 'Sin espacio libre',
            bloqueo_espacios: true
        }));
    }

    // Nombres de servicio de una cita, como los guarda la base: en minusculas y sin espacios sobrantes.
    // Acepta un texto ("Corte + Barba": varios servicios en una cita), un servicio ({ nombre }) o una lista.
    function nombresDeServicio(servicio) {
        const partes = Array.isArray(servicio) ? servicio : [servicio];
        return partes
            .flatMap(item => String(item && typeof item === 'object' ? item.nombre : item || '').split(' + '))
            .map(nombre => nombre.trim().toLowerCase())
            .filter(Boolean);
    }

    // Espacios del servicio. `porNombre`: { 'corte': [1, 2] } solo con los servicios que tienen espacios.
    // Con varios nombres se usan los espacios comunes; si no hay ninguno en comun (o ninguno tiene espacios)
    // devuelve null = sin restriccion de servicio (mejor no bloquear un combo raro).
    function espaciosDelServicio(servicio, porNombre) {
        let comunes = null;
        nombresDeServicio(servicio).forEach(nombre => {
            const suyos = porNombre && porNombre[nombre];
            if (!suyos || !suyos.length) return;
            comunes = comunes === null ? suyos : comunes.filter(n => suyos.includes(n));
        });
        return comunes && comunes.length ? comunes : null;
    }

    // Espacios que puede usar una cita: los de la profesional Y los del servicio.
    // null = sin restriccion; [] = hay restriccion pero ningun espacio sirve (esa profesional no hace ese servicio).
    // Debe decir lo mismo que espacios_permitidos() en sql-espacios.sql.
    function espaciosPermitidos(espaciosProf, espaciosServicio) {
        const prof = espaciosProf && espaciosProf.length ? espaciosProf : null;
        const serv = espaciosServicio && espaciosServicio.length ? espaciosServicio : null;
        if (!prof && !serv) return null;
        if (!prof) return serv;
        if (!serv) return prof;
        return prof.filter(n => serv.includes(n));
    }

    // Cuando ningun espacio sirve, esa profesional no puede hacer el servicio en ningun momento:
    // un bloqueo de dia completo por cada fecha pedida (maximo 62 dias).
    function bloqueosDiaCompleto(profesionalId, fechaInicio, fechaFin) {
        const bloqueos = [];
        const dia = new Date(`${fechaInicio}T12:00:00Z`);
        const ultimo = new Date(`${fechaFin || fechaInicio}T12:00:00Z`);
        for (let i = 0; i < 62 && dia <= ultimo; i++, dia.setUTCDate(dia.getUTCDate() + 1)) {
            bloqueos.push({
                id: null,
                fecha: dia.toISOString().slice(0, 10),
                hora_inicio: '00:00:00',
                hora_fin: '23:59:00',
                profesional_id: profesionalId,
                estado: 'Bloqueado',
                cliente_nombre: 'Sin espacio para este servicio',
                servicio: 'Sin espacio libre',
                bloqueo_espacios: true
            });
        }
        return bloqueos;
    }

    const api = { aMinutos, estaActivo, espaciosDe, bloqueosPorEspacios, nombresDeServicio, espaciosDelServicio, espaciosPermitidos, bloqueosDiaCompleto };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window === 'undefined') return;

    // ---- Lo que sigue habla con Supabase y no se prueba en node ----
    const CACHE_MS = 60 * 1000;
    let cache = null;

    function negocioId() {
        return (typeof window.getNegocioId === 'function' && window.getNegocioId()) || '';
    }

    function cabeceras() {
        return { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` };
    }

    // Configuracion de espacios del salon + espacios de cada profesional. Si el SQL todavia no
    // se corrio (las columnas no existen) o falla la red, se comporta como "sin espacios".
    async function cargarConfig(forzar) {
        const id = negocioId();
        if (!forzar && cache && cache.id === id && Date.now() - cache.hora < CACHE_MS) return cache.valor;
        let valor = { activo: false, cantidad: 0, porProfesional: {}, porServicio: {} };
        try {
            const resConfig = await fetch(
                `${window.SUPABASE_URL}/rest/v1/configuracion?negocio_id=eq.${id}&select=espacios_activos,espacios_cantidad`,
                { headers: cabeceras() }
            );
            if (resConfig.ok) {
                const filas = await resConfig.json();
                const cfg = filas && filas[0];
                if (estaActivo(cfg)) {
                    const resProf = await fetch(
                        `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${id}&select=id,espacios`,
                        { headers: cabeceras() }
                    );
                    const profs = resProf.ok ? await resProf.json() : [];
                    const cantidad = parseInt(cfg.espacios_cantidad, 10) || 0;
                    valor = { activo: true, cantidad, porProfesional: {}, porServicio: {} };
                    (profs || []).forEach(p => { valor.porProfesional[String(p.id)] = espaciosDe(p, cantidad); });
                    // Espacios por servicio; si no se pueden leer, los servicios quedan sin restriccion.
                    const resServ = await fetch(
                        `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${id}&select=nombre,espacios`,
                        { headers: cabeceras() }
                    );
                    ((resServ.ok ? await resServ.json() : []) || []).forEach(servicio => {
                        const suyos = espaciosDe(servicio, cantidad);
                        if (suyos.length) valor.porServicio[String(servicio.nombre || '').trim().toLowerCase()] = suyos;
                    });
                }
            }
        } catch (error) {
            console.warn('Espacios: no se pudo leer la configuracion', error);
        }
        cache = { id, hora: Date.now(), valor };
        return valor;
    }

    // Suma a las citas de la profesional los tramos bloqueados por espacios. `servicio` (nombre, servicio o
    // lista) es el que se quiere reservar: sus espacios tambien cuentan; sin el solo cuentan los de la
    // profesional. Sin la funcion activa devuelve las citas tal cual, asi que es seguro llamarla siempre.
    async function reservasConEspacios(profesionalId, fechaInicio, fechaFin, reservasProfesional, excluirId, servicio) {
        const propias = Array.isArray(reservasProfesional) ? reservasProfesional : [];
        try {
            const cfg = await cargarConfig();
            if (!cfg.activo) return propias;
            const suyos = espaciosPermitidos(
                cfg.porProfesional[String(profesionalId)],
                espaciosDelServicio(servicio, cfg.porServicio)
            );
            if (suyos === null) return propias;
            if (suyos.length === 0) return propias.concat(bloqueosDiaCompleto(profesionalId, fechaInicio, fechaFin));
            const res = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId()}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin || fechaInicio}&espacio=not.is.null&estado=neq.Cancelado&select=id,fecha,hora_inicio,hora_fin,profesional_id,espacio`,
                { headers: cabeceras(), cache: 'no-store' }
            );
            if (!res.ok) return propias;
            return propias.concat(bloqueosPorEspacios(profesionalId, suyos, await res.json(), excluirId));
        } catch (error) {
            console.warn('Espacios: no se pudieron revisar las citas del salon', error);
            return propias;
        }
    }

    // Reparte las citas futuras que aun no tienen espacio (al activar la funcion). Lo hace la base
    // (asignar_espacios_futuros): las ordena por fecha y hora y les da el primer espacio libre.
    // Devuelve las que NO caben (ya estaban sobrepuestas) para avisar a la duena.
    async function asignarCitasFuturas() {
        const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/asignar_espacios_futuros`, {
            method: 'POST',
            headers: { ...cabeceras(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_negocio: negocioId() })
        });
        if (!res.ok) throw new Error(await res.text());
        return { sinCupo: await res.json() };
    }

    // Activa o apaga la funcion y fija cuantos espacios hay. Si el salon aun no tiene fila de
    // configuracion la crea con los mismos valores por defecto que salonConfig.guardar.
    async function guardarConfig(activo, cantidad) {
        const id = negocioId();
        const base = `${window.SUPABASE_URL}/rest/v1/configuracion`;
        const cabecera = { ...cabeceras(), 'Content-Type': 'application/json', Prefer: 'return=representation' };
        const campos = { espacios_activos: !!activo, espacios_cantidad: Math.max(0, parseInt(cantidad, 10) || 0) };
        const patch = await fetch(`${base}?negocio_id=eq.${id}`, { method: 'PATCH', headers: cabecera, body: JSON.stringify(campos) });
        if (!patch.ok) throw new Error(await patch.text());
        if (!(await patch.json()).length) {
            const post = await fetch(base, {
                method: 'POST', headers: cabecera,
                body: JSON.stringify({
                    negocio_id: id, duracion_turnos: 60, intervalo_entre_turnos: 0, modo_24h: false,
                    max_antelacion_dias: 30, min_antelacion_horas: 2, min_cancelacion_horas: 1, ...campos
                })
            });
            if (!post.ok) throw new Error(await post.text());
        }
        cache = null;
    }

    // Marca los espacios de una profesional.
    async function guardarEspaciosProfesional(profesionalId, espacios) {
        const res = await fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId()}&id=eq.${profesionalId}`, {
            method: 'PATCH',
            headers: { ...cabeceras(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ espacios })
        });
        if (!res.ok) throw new Error(await res.text());
        cache = null;
    }

    // Crear o editar un servicio avisa con este evento (utils/servicios.js): lo leido de sus espacios ya no vale.
    if (typeof window.addEventListener === 'function') window.addEventListener('serviciosActualizados', () => { cache = null; });

    raiz.espacios = { ...api, cargarConfig, reservasConEspacios, asignarCitasFuturas, guardarConfig, guardarEspaciosProfesional, limpiarCache: () => { cache = null; } };
})(typeof window !== 'undefined' ? window : globalThis);
