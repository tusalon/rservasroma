// utils/profesionales.js - Gestión de profesionales (CORREGIDO)

console.log('👥 profesionales.js cargado');

// getNegocioId() la define utils/config-negocio-master.js (window.getNegocioId),
// cargado antes que este archivo en todas las paginas que lo usan.

let profesionalesCache = [];
let ultimaActualizacionProfesionales = 0;
const CACHE_DURATION_PROFESIONALES = 5 * 60 * 1000;

// Hoy en hora local (YYYY-MM-DD): la fecha de una cita es la del salon, no la UTC.
function fechaHoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function hashPasswordProfesional(password) {
    const texto = String(password || '').trim();
    if (!texto || !window.crypto?.subtle) return texto;

    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(texto));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `sha256$${hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function cargarProfesionalesDesdeDB() {
    try {
        const negocioId = window.esperarNegocioId ? await window.esperarNegocioId() : getNegocioId();
        console.log('🌐 Cargando profesionales desde Supabase para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&select=id,negocio_id,nombre,especialidad,color,avatar,activo,telefono,nivel,fechas_libres&order=id.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        profesionalesCache = data;
        ultimaActualizacionProfesionales = Date.now();
        return data;
    } catch (error) {
        console.error('Error cargando profesionales:', error);
        return null;
    }
}

window.salonProfesionales = {
    getAll: async function(activos = true) {
        if (Date.now() - ultimaActualizacionProfesionales < CACHE_DURATION_PROFESIONALES && profesionalesCache.length > 0) {
            if (activos) {
                return profesionalesCache.filter(p => p.activo === true);
            }
            return [...profesionalesCache];
        }
        
        const datos = await cargarProfesionalesDesdeDB();
        if (datos) {
            if (activos) {
                return datos.filter(p => p.activo === true);
            }
            return datos;
        }
        return [];
    },
    
    getById: async function(id) {
        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}&select=id,negocio_id,nombre,especialidad,color,avatar,activo,telefono,nivel,fechas_libres`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data[0] || null;
        } catch (error) {
            console.error('Error obteniendo profesional:', error);
            return null;
        }
    },
    
    crear: async function(profesional) {
        try {
            const passwordHash = profesional.password ? await hashPasswordProfesional(profesional.password) : null;
            const negocioId = getNegocioId();
            console.log('➕ Creando profesional para negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        negocio_id: negocioId,
                        nombre: profesional.nombre,
                        especialidad: profesional.especialidad,
                        color: profesional.color || 'bg-amber-600',
                        avatar: profesional.avatar || '👤',
                        activo: true,
                        telefono: profesional.telefono || null,
                        password: passwordHash,
                        nivel: profesional.nivel || 1
                    })
                }
            );
            
            if (!response.ok) return null;
            
            const nuevo = await response.json();
            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return nuevo[0];
        } catch (error) {
            console.error('Error en crear:', error);
            return null;
        }
    },
    
    actualizar: async function(id, cambios) {
        try {
            const negocioId = getNegocioId();
            console.log('✏️ Actualizando profesional:', id, 'negocio:', negocioId);
            
            const cambiosLimpios = { ...cambios };
            if (!String(cambiosLimpios.password || '').trim()) {
                delete cambiosLimpios.password;
            } else {
                cambiosLimpios.password = await hashPasswordProfesional(cambiosLimpios.password);
            }

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(cambiosLimpios)
                }
            );
            
            if (!response.ok) return null;
            
            const actualizado = await response.json();
            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return actualizado[0];
        } catch (error) {
            console.error('Error en actualizar:', error);
            return null;
        }
    },
    
    // Antes de eliminar: que se llevaria por delante. La base rechaza borrar a quien aparece en una reserva
    // (reservas.profesional_id sin ON DELETE), asi que eliminar() primero suelta esas reservas. El historial
    // no impide borrar; las citas FUTURAS si requieren que la duena lo decida (se cancelarian).
    consecuenciasDeEliminar: async function(id) {
        const negocioId = getNegocioId();
        const headers = {
            'apikey': window.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
        };
        const base = `${window.SUPABASE_URL}/rest/v1`;

        // reservas del profesional (cuenta exacta sin traer filas)
        const resReservas = await fetch(
            `${base}/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${id}&select=id`,
            { headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' } }
        );
        if (!resReservas.ok && resReservas.status !== 206) throw new Error(`reservas ${resReservas.status}`);
        const rango = resReservas.headers.get('content-range') || '';
        const total = parseInt(rango.split('/')[1], 10);
        const reservas = Number.isFinite(total) ? total : 0;

        // citas futuras todavia activas: esas son las que alguien espera
        const resFuturas = await fetch(
            `${base}/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${id}&fecha=gte.${fechaHoyLocal()}&estado=in.(Reservado,Pendiente)&select=id`,
            { headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' } }
        );
        if (!resFuturas.ok && resFuturas.status !== 206) throw new Error(`reservas futuras ${resFuturas.status}`);
        const totalFuturas = parseInt((resFuturas.headers.get('content-range') || '').split('/')[1], 10);
        const futuras = Number.isFinite(totalFuturas) ? totalFuturas : 0;

        // servicios que se quedarian sin ningun profesional
        let serviciosSinNadie = [];
        const resMios = await fetch(
            `${base}/servicios_profesionales?negocio_id=eq.${negocioId}&profesional_id=eq.${id}&select=servicio_id`,
            { headers }
        );
        if (resMios.ok) {
            const mios = (await resMios.json()).map(r => r.servicio_id);
            if (mios.length) {
                const lista = mios.join(',');
                const resTodos = await fetch(
                    `${base}/servicios_profesionales?negocio_id=eq.${negocioId}&servicio_id=in.(${lista})&select=servicio_id,profesional_id`,
                    { headers }
                );
                const resServicios = await fetch(
                    `${base}/servicios?negocio_id=eq.${negocioId}&id=in.(${lista})&select=id,nombre,activo`,
                    { headers }
                );
                if (resTodos.ok && resServicios.ok) {
                    const asignaciones = await resTodos.json();
                    const servicios = await resServicios.json();
                    const solos = mios.filter(sid => {
                        const otros = asignaciones.filter(r => r.servicio_id === sid && Number(r.profesional_id) !== Number(id));
                        return otros.length === 0;
                    });
                    serviciosSinNadie = servicios
                        .filter(sv => solos.includes(sv.id) && sv.activo !== false)
                        .map(sv => sv.nombre);
                }
            }
        }

        return { reservas, futuras, serviciosSinNadie };
    },

    // Elimina al profesional. Sus reservas se conservan (nombre incluido) pero dejan de apuntar a su ficha.
    // cancelarFuturas: solo si la duena lo decidio, cancela antes sus citas futuras activas.
    // Si algun paso falla devuelve false y NO borra la ficha.
    eliminar: async function(id, { cancelarFuturas = false } = {}) {
        try {
            const negocioId = getNegocioId();
            console.log('🗑️ Eliminando profesional:', id, 'negocio:', negocioId);
            const base = `${window.SUPABASE_URL}/rest/v1`;
            const headers = {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            };
            const paso = async (url, method, body) => {
                const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
                if (!res.ok) console.warn('No se pudo eliminar el profesional:', method, res.status);
                return res.ok;
            };

            if (cancelarFuturas) {
                const okCancelar = await paso(
                    `${base}/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${id}&fecha=gte.${fechaHoyLocal()}&estado=in.(Reservado,Pendiente)`,
                    'PATCH', { estado: 'Cancelado' });
                if (!okCancelar) return false;
            }
            // Soltar TODAS sus reservas: sin esto la llave foranea rechaza el borrado (409).
            if (!await paso(`${base}/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${id}`, 'PATCH', { profesional_id: null })) return false;
            if (!await paso(`${base}/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}`, 'DELETE')) return false;

            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminar:', error);
            return false;
        }
    }
};

setTimeout(async () => {
    await window.salonProfesionales.getAll(false);
}, 1000);
