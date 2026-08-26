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

if (typeof window !== 'undefined') {
    window.getFidelizacionConfig = getFidelizacionConfig;
    window.esPosicionPremiada = esPosicionPremiada;
    window.faltanParaPremio = faltanParaPremio;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFidelizacionConfig, esPosicionPremiada, faltanParaPremio };
}
