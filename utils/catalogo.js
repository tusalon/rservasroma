// utils/catalogo.js - Catalogo de disenos del negocio (galeria + votos)
//
// La clienta ve los trabajos reales del salon, vota cuanto le gusta cada uno
// y reserva el que quiere. Tabla: catalogo_disenos / catalogo_votos
// (ver sql-catalogo-disenos.sql).

console.log('🖼️ catalogo.js cargado');

const CATALOGO_CACHE_MS = 3 * 60 * 1000;
let catalogoCache = null;
let catalogoCacheNegocio = '';
let catalogoCacheTiempo = 0;

function catalogoHeaders(extra) {
    return Object.assign({
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    }, extra || {});
}

// Huella del dispositivo: solo evita que el mismo telefono vote 200 veces el
// mismo diseno. No se usa para identificar a nadie ni se cruza con el cliente.
function catalogoIdDispositivo() {
    try {
        let id = localStorage.getItem('catalogoDispositivo');
        if (!id) {
            id = 'd-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
            localStorage.setItem('catalogoDispositivo', id);
        }
        return id;
    } catch (e) {
        // Modo privado sin localStorage: el voto se manda igual, solo que este
        // dispositivo podria votar de nuevo tras recargar. Es aceptable.
        return 'd-anonimo-' + Date.now().toString(36);
    }
}

// Promedio 0-100 ya calculado por el trigger. Devuelve null si nadie ha votado
// todavia (asi la tarjeta no muestra un "0%" injusto en un diseno nuevo).
function catalogoPromedio(diseno) {
    const conteo = parseInt(diseno?.votos_conteo, 10) || 0;
    if (conteo <= 0) return null;
    const suma = parseInt(diseno?.votos_suma, 10) || 0;
    return Math.round(suma / conteo);
}

async function catalogoObtenerDisenos(opciones) {
    const config = opciones || {};
    const negocioId = window.getNegocioId?.();
    if (!negocioId) {
        console.warn('catalogo: sin negocio_id');
        return [];
    }

    const soloActivos = config.incluirOcultos ? '' : '&activo=eq.true';
    const cacheValida = catalogoCache &&
        catalogoCacheNegocio === negocioId + soloActivos &&
        (Date.now() - catalogoCacheTiempo) < CATALOGO_CACHE_MS;

    if (cacheValida && !config.forzar) return catalogoCache;

    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/catalogo_disenos?negocio_id=eq.${negocioId}${soloActivos}&order=orden.asc,id.desc`,
            { headers: catalogoHeaders(), cache: 'no-store' }
        );
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        catalogoCache = Array.isArray(data) ? data : [];
        catalogoCacheNegocio = negocioId + soloActivos;
        catalogoCacheTiempo = Date.now();
        return catalogoCache;
    } catch (error) {
        console.error('Error cargando el catalogo:', error);
        // Si ya habia datos cacheados se devuelven: mejor un catalogo viejo
        // que una pantalla vacia cuando se cae la conexion a mitad de uso.
        return catalogoCache || [];
    }
}

function catalogoInvalidarCache() {
    catalogoCache = null;
    catalogoCacheTiempo = 0;
}

// Categorias reales derivadas de los disenos: no hay tabla aparte porque la
// categoria de un catalogo es texto libre que escribe la duena del salon.
function catalogoCategorias(disenos) {
    const mapa = new Map();
    (disenos || []).forEach(d => {
        const nombre = String(d.categoria || '').trim();
        if (!nombre) return;
        mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    });
    return [...mapa.entries()]
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total);
}

async function catalogoVotar(disenoId, puntuacion, nombre) {
    const valor = Math.max(0, Math.min(100, Math.round(Number(puntuacion) || 0)));
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/catalogo_votos?on_conflict=diseno_id,dispositivo`,
            {
                method: 'POST',
                // merge-duplicates = si este dispositivo ya voto, se actualiza
                // su voto en vez de fallar por la restriccion unica.
                headers: catalogoHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
                body: JSON.stringify({
                    diseno_id: disenoId,
                    dispositivo: catalogoIdDispositivo(),
                    puntuacion: valor,
                    nombre: (nombre || '').trim().slice(0, 60) || null
                })
            }
        );
        if (!response.ok) throw new Error('HTTP ' + response.status);
        try { localStorage.setItem('catalogoVoto:' + disenoId, String(valor)); } catch (e) {}
        catalogoInvalidarCache();
        return { success: true, puntuacion: valor };
    } catch (error) {
        console.error('Error al votar:', error);
        return { success: false, error };
    }
}

function catalogoVotoPropio(disenoId) {
    try {
        const guardado = localStorage.getItem('catalogoVoto:' + disenoId);
        return guardado === null ? null : parseInt(guardado, 10);
    } catch (e) {
        return null;
    }
}

// ============================================
// ADMINISTRACION (panel del salon)
// ============================================
async function catalogoCrearDiseno(datos) {
    const negocioId = window.getNegocioId?.();
    if (!negocioId) return { success: false, error: new Error('Sin negocio') };

    try {
        const response = await fetch(`${window.SUPABASE_URL}/rest/v1/catalogo_disenos`, {
            method: 'POST',
            headers: catalogoHeaders({ 'Prefer': 'return=representation' }),
            body: JSON.stringify({
                negocio_id: negocioId,
                titulo: datos.titulo,
                descripcion: datos.descripcion || null,
                imagen_url: datos.imagen_url,
                categoria: (datos.categoria || '').trim() || 'general',
                servicio_id: datos.servicio_id ? String(datos.servicio_id) : null,
                servicio_nombre: datos.servicio_nombre || null,
                orden: parseInt(datos.orden, 10) || 99,
                activo: datos.activo !== false
            })
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        catalogoInvalidarCache();
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error creando diseno:', error);
        return { success: false, error };
    }
}

async function catalogoActualizarDiseno(id, cambios) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/catalogo_disenos?id=eq.${id}`,
            {
                method: 'PATCH',
                headers: catalogoHeaders({ 'Prefer': 'return=representation' }),
                body: JSON.stringify(cambios)
            }
        );
        if (!response.ok) throw new Error(await response.text());
        catalogoInvalidarCache();
        return { success: true };
    } catch (error) {
        console.error('Error actualizando diseno:', error);
        return { success: false, error };
    }
}

async function catalogoEliminarDiseno(id) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/catalogo_disenos?id=eq.${id}`,
            { method: 'DELETE', headers: catalogoHeaders() }
        );
        if (!response.ok) throw new Error(await response.text());
        catalogoInvalidarCache();
        return { success: true };
    } catch (error) {
        console.error('Error eliminando diseno:', error);
        return { success: false, error };
    }
}

window.catalogoObtenerDisenos = catalogoObtenerDisenos;
window.catalogoInvalidarCache = catalogoInvalidarCache;
window.catalogoCategorias = catalogoCategorias;
window.catalogoPromedio = catalogoPromedio;
window.catalogoVotar = catalogoVotar;
window.catalogoVotoPropio = catalogoVotoPropio;
window.catalogoIdDispositivo = catalogoIdDispositivo;
window.catalogoCrearDiseno = catalogoCrearDiseno;
window.catalogoActualizarDiseno = catalogoActualizarDiseno;
window.catalogoEliminarDiseno = catalogoEliminarDiseno;

console.log('✅ catalogo.js funciones disponibles');
