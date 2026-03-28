// utils/servicios.js - Gestión de servicios (CORREGIDO)

console.log('💅 servicios.js cargado (modo Supabase)');

// Helper para obtener negocio_id - SIN RECURSIÓN
function getNegocioId() {
    // Usar la función global de config-negocio.js si existe
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    // Fallback a localStorage
    return localStorage.getItem('negocioId');
}

let serviciosCache = [];
let ultimaActualizacionServicios = 0;
const CACHE_DURATION_SERVICIOS = 5 * 60 * 1000;

async function cargarServiciosDesdeDB() {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Cargando servicios desde Supabase para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=*&order=id.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }
        
        const data = await response.json();
        console.log('✅ Servicios cargados desde Supabase:', data);
        serviciosCache = data;
        ultimaActualizacionServicios = Date.now();
        return data;
    } catch (error) {
        console.error('Error cargando servicios:', error);
        return null;
    }
}

window.salonServicios = {
    getAll: async function(activos = true) {
        if (Date.now() - ultimaActualizacionServicios < CACHE_DURATION_SERVICIOS && serviciosCache.length > 0) {
            if (activos) {
                return serviciosCache.filter(s => s.activo === true);
            }
            return [...serviciosCache];
        }
        
        const datos = await cargarServiciosDesdeDB();
        if (datos && datos.length > 0) {
            if (activos) {
                return datos.filter(s => s.activo === true);
            }
            return datos;
        }
        
        return [];
    },
    
    getById: async function(id) {
        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&id=eq.${id}&select=*`,
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
            console.error('Error obteniendo servicio:', error);
            return null;
        }
    },
    
    crear: async function(servicio) {
        try {
            const negocioId = getNegocioId();
            console.log('➕ Creando servicio para negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/servicios`,
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
                        nombre: servicio.nombre,
                        duracion: servicio.duracion,
                        precio: servicio.precio,
                        descripcion: servicio.descripcion || '',
                        activo: true,
                        imagen: servicio.imagen || null,
                        horarios_permitidos: servicio.horarios_permitidos || []   // ✅ NUEVO
                    })
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error al crear servicio:', error);
                return null;
            }
            
            const nuevo = await response.json();
            console.log('✅ Servicio creado:', nuevo);
            
            serviciosCache = await cargarServiciosDesdeDB() || serviciosCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('serviciosActualizados'));
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
            console.log('✏️ Actualizando servicio', id, 'negocio:', negocioId);
            
            const datosActualizar = {};
            if (cambios.nombre !== undefined) datosActualizar.nombre = cambios.nombre;
            if (cambios.duracion !== undefined) datosActualizar.duracion = cambios.duracion;
            if (cambios.precio !== undefined) datosActualizar.precio = cambios.precio;
            if (cambios.descripcion !== undefined) datosActualizar.descripcion = cambios.descripcion;
            if (cambios.activo !== undefined) datosActualizar.activo = cambios.activo;
            if (cambios.imagen !== undefined) datosActualizar.imagen = cambios.imagen;
            if (cambios.horarios_permitidos !== undefined) datosActualizar.horarios_permitidos = cambios.horarios_permitidos;   // ✅ NUEVO
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(datosActualizar)
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error al actualizar servicio:', error);
                return null;
            }
            
            const actualizado = await response.json();
            console.log('✅ Servicio actualizado:', actualizado);
            
            serviciosCache = await cargarServiciosDesdeDB() || serviciosCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('serviciosActualizados'));
            }
            
            return actualizado[0];
        } catch (error) {
            console.error('Error en actualizar:', error);
            return null;
        }
    },
    
    eliminar: async function(id) {
        try {
            const negocioId = getNegocioId();
            console.log('🗑️ Eliminando servicio:', id, 'negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&id=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error al eliminar servicio:', error);
                return false;
            }
            
            console.log('✅ Servicio eliminado');
            
            serviciosCache = await cargarServiciosDesdeDB() || serviciosCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('serviciosActualizados'));
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminar:', error);
            return false;
        }
    }
};

setTimeout(async () => {
    await window.salonServicios.getAll(false);
}, 1000);

console.log('✅ salonServicios inicializado');