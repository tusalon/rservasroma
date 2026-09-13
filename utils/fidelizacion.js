// utils/fidelizacion.js
// Sistema de fidelizacion: cada N citas completadas de una clienta, la
// siguiente cita tiene un descuento configurable por la duena del salon.
//
// Se guarda "cada_citas" (N) pero el ciclo que se repite es N+1 (N citas
// normales + 1 premiada): con N=5 la premiada es la 6ta, la 12va, la 18va...

function getFidelizacionConfig(config) {
    const cada = Math.max(1, parseInt(config?.fidelizacion_cada_citas, 10) || 5);
    const pct = Math.max(0, Math.min(100, Number(config?.fidelizacion_descuento_porcentaje) || 0));
    return { activa: config?.fidelizacion_activa === true && pct > 0, ciclo: cada + 1, pct };
}

// posicion: 1-based, posicion de una cita completada dentro del historial
// cronologico de citas completadas de la clienta.
function esPosicionPremiada(posicion, ciclo) {
    return posicion > 0 && ciclo > 0 && posicion % ciclo === 0;
}

// Cuantas citas completadas le faltan a la clienta para la proxima premiada,
// contando la que reservaria ahora (completadas + 1).
function faltanParaPremio(completadas, ciclo) {
    if (ciclo <= 0) return 0;
    const siguiente = completadas + 1;
    const posicion = siguiente % ciclo;
    return posicion === 0 ? 0 : ciclo - posicion;
}

// Progreso dentro del ciclo que esta corriendo, que es lo que la duena quiere
// ver de un vistazo: "3/6". El "ajuste" son las citas completadas que NO
// cuentan porque las quito a mano (ver sql-fidelizacion-ajustes.sql). Nunca
// deja el resultado por debajo de cero, ni aunque el ajuste se quede viejo.
function progresoFidelizacion(completadas, ajuste, ciclo) {
    const total = Math.max(0, parseInt(completadas, 10) || 0);
    const descontadas = Math.min(total, Math.max(0, parseInt(ajuste, 10) || 0));
    const efectivas = total - descontadas;
    if (!(ciclo > 0)) return { efectivas, enCiclo: 0, ciclo: 0, faltan: 0, premiada: false };

    const faltan = faltanParaPremio(efectivas, ciclo);
    return {
        efectivas,
        // Cuantas lleva dentro del ciclo actual. Al completar la premiada
        // vuelve a 0: ese ciclo se cerro y empieza el siguiente.
        enCiclo: efectivas % ciclo,
        ciclo,
        faltan,
        premiada: faltan === 0
    };
}

// Cuanto hay que guardar como ajuste para dejar el contador en cero.
function ajusteParaReiniciar(completadas) {
    return Math.max(0, parseInt(completadas, 10) || 0);
}

// Quitar una cita: el ajuste sube, pero nunca por encima del total real (si no,
// al completar la siguiente cita el progreso no se moveria).
function ajusteQuitandoUna(completadas, ajuste) {
    const total = Math.max(0, parseInt(completadas, 10) || 0);
    return Math.min(total, Math.max(0, parseInt(ajuste, 10) || 0) + 1);
}

// ─── Acceso a datos (tabla fidelizacion_ajustes) ────────────────────────────
// Separado a proposito de las funciones de arriba: esas son cuentas puras y
// tienen prueba en tests/fidelizacion.test.js; estas hablan con la red.

function cabecerasFidelizacion(extra) {
    return Object.assign({
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }, extra || {});
}

// Devuelve { telefonoNormalizado: ajuste }. Una sola consulta para todo el
// salon: la lista de clientas ya esta en memoria y se cruza por telefono, en
// vez de pedir un ajuste por clienta.
async function cargarAjustesFidelizacion(negocioId) {
    if (!negocioId) return {};
    try {
        const respuesta = await fetch(
            `${window.SUPABASE_URL}/rest/v1/fidelizacion_ajustes?negocio_id=eq.${encodeURIComponent(negocioId)}&select=whatsapp,ajuste`,
            { headers: cabecerasFidelizacion(), cache: 'no-store' }
        );
        // La tabla puede no existir todavia (sql-fidelizacion-ajustes.sql sin
        // correr): se sigue sin ajustes en vez de romper la ficha del cliente.
        if (!respuesta.ok) return {};
        const filas = await respuesta.json();
        const mapa = {};
        (Array.isArray(filas) ? filas : []).forEach(fila => {
            mapa[String(fila.whatsapp)] = parseInt(fila.ajuste, 10) || 0;
        });
        return mapa;
    } catch (error) {
        console.warn('No se pudieron leer los ajustes de fidelización:', error);
        return {};
    }
}

async function guardarAjusteFidelizacion(negocioId, whatsapp, ajuste) {
    if (!negocioId || !whatsapp) return { success: false };
    try {
        const respuesta = await fetch(
            `${window.SUPABASE_URL}/rest/v1/fidelizacion_ajustes?on_conflict=negocio_id,whatsapp`,
            {
                method: 'POST',
                headers: cabecerasFidelizacion({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
                body: JSON.stringify({
                    negocio_id: negocioId,
                    whatsapp: String(whatsapp),
                    ajuste: Math.max(0, parseInt(ajuste, 10) || 0),
                    actualizado_en: new Date().toISOString()
                })
            }
        );
        if (!respuesta.ok) {
            const detalle = await respuesta.text();
            console.error('No se pudo guardar el ajuste de fidelización:', detalle);
            return { success: false, error: detalle };
        }
        return { success: true };
    } catch (error) {
        console.error('No se pudo guardar el ajuste de fidelización:', error);
        return { success: false, error };
    }
}

if (typeof window !== 'undefined') {
    window.cargarAjustesFidelizacion = cargarAjustesFidelizacion;
    window.guardarAjusteFidelizacion = guardarAjusteFidelizacion;
    window.getFidelizacionConfig = getFidelizacionConfig;
    window.esPosicionPremiada = esPosicionPremiada;
    window.faltanParaPremio = faltanParaPremio;
    window.progresoFidelizacion = progresoFidelizacion;
    window.ajusteParaReiniciar = ajusteParaReiniciar;
    window.ajusteQuitandoUna = ajusteQuitandoUna;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getFidelizacionConfig,
        esPosicionPremiada,
        faltanParaPremio,
        progresoFidelizacion,
        ajusteParaReiniciar,
        ajusteQuitandoUna
    };
}
