// utils/auth-clients.js - REGISTRO AUTOMATICO, CON APROBACION OPCIONAL
// Por defecto las clientas se registran solas y entran al instante. Si el salon
// activa "aprobar_clientes_nuevos" en Editar Negocio, la clienta nueva queda
// pendiente hasta que la duena la acepte desde el panel.

console.log('🚀 auth-clients.js CARGADO');

// getNegocioId() la define utils/config-negocio-master.js (window.getNegocioId),
// cargado antes que este archivo en todas las paginas que lo usan.

// Una clienta esta aprobada si tiene fecha_aprobacion. La columna ya existia y
// todas las filas anteriores a esta funcion la traen puesta, asi que la
// clientela de siempre queda aprobada sola: la aprobacion solo afecta a las que
// se registren despues de encender la opcion.
window.clienteEstaAprobado = function(cliente) {
    return !!(cliente && cliente.fecha_aprobacion);
};

// Devuelve la fila tal cual si esta aprobada, o marcada con pendiente:true si no.
// Todas las funciones que devuelven una clienta pasan por aca, para que ninguna
// via de entrada se olvide de la marca y deje pasar a una pendiente.
function marcarSiPendiente(cliente) {
    if (!cliente) return cliente;
    const fila = Array.isArray(cliente) ? cliente[0] : cliente;
    if (!fila) return null;
    return window.clienteEstaAprobado(fila) ? fila : { ...fila, pendiente: true };
}

// Lee del negocio si hay que aprobar a mano a las clientas nuevas.
//
// Pide la config FRESCA a proposito. El app de clientas arranca devolviendo la
// copia de la visita anterior guardada en el telefono (arranque rapido) y
// refresca contra la red en segundo plano; con la copia vieja, un salon que
// acababa de activar la aprobacion seguia registrando clientas nuevas al
// instante, que es justo lo que la duena quiso evitar. Esto pasa una sola vez
// por registro, no en cada pantalla, asi que la peticion extra no se nota.
//
// Si la red falla se usa la copia local antes que asumir "no hay que aprobar":
// para un salon que activo la opcion, colar a alguien sin permiso es peor que
// hacerla esperar. Solo cuando no hay ninguna config (ni fresca ni guardada) se
// vuelve al comportamiento de siempre, para no dejar a un salon sin registrar.
window.negocioApruebaClientesAMano = async function() {
    try {
        const fresca = await window.cargarConfiguracionNegocio?.(true);
        const config = fresca || await window.cargarConfiguracionNegocio?.();
        return config?.aprobar_clientes_nuevos === true;
    } catch (error) {
        console.warn('No se pudo leer aprobar_clientes_nuevos, se asume que no:', error);
        return false;
    }
};

function normalizarWhatsappCliente(whatsapp) {
    if (window.normalizarTelefonoInternacional) {
        return window.normalizarTelefonoInternacional(whatsapp);
    }
    const digits = String(whatsapp || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('53') && digits.length > 8 ? digits : `53${digits}`;
}

window.getClienteBloqueado = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        const numero = normalizarWhatsappCliente(whatsapp);
        if (!negocioId || !numero) return null;

        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_bloqueados?negocio_id=eq.${negocioId}&whatsapp=eq.${numero}&activo=eq.true&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.warn('No se pudo consultar lista negra:', await response.text());
            return null;
        }

        const data = await response.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.warn('Error consultando lista negra:', error);
        return null;
    }
};

window.isClienteBloqueado = async function(whatsapp) {
    return !!(await window.getClienteBloqueado(whatsapp));
};

window.getClientesBloqueados = async function() {
    try {
        const negocioId = window.esperarNegocioId ? await window.esperarNegocioId() : getNegocioId();
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_bloqueados?negocio_id=eq.${negocioId}&activo=eq.true&select=*&order=fecha_bloqueo.desc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.warn('No se pudo cargar lista negra:', await response.text());
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn('Error cargando lista negra:', error);
        return [];
    }
};

window.bloquearCliente = async function({ nombre, whatsapp, motivo }) {
    try {
        const negocioId = getNegocioId();
        const numero = normalizarWhatsappCliente(whatsapp);
        if (!negocioId || !numero) return false;

        const existente = await window.getClienteBloqueado(numero);
        if (existente) return true;

        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_bloqueados`,
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
                    nombre: nombre || '',
                    whatsapp: numero,
                    motivo: motivo || '',
                    activo: true,
                    fecha_bloqueo: new Date().toISOString()
                })
            }
        );

        if (!response.ok) {
            console.error('Error bloqueando cliente:', await response.text());
            return false;
        }

        await window.eliminarCliente?.(numero);
        return true;
    } catch (error) {
        console.error('Error en bloquearCliente:', error);
        return false;
    }
};

window.desbloquearCliente = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        const numero = normalizarWhatsappCliente(whatsapp);
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_bloqueados?negocio_id=eq.${negocioId}&whatsapp=eq.${numero}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ activo: false, fecha_desbloqueo: new Date().toISOString() })
            }
        );

        if (!response.ok) {
            console.error('Error desbloqueando cliente:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error en desbloquearCliente:', error);
        return false;
    }
};

// ============================================
// FUNCIÓN PRINCIPAL - VERIFICAR O CREAR CLIENTE
// ============================================

/**
 * Verifica si un cliente existe en la base de datos
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente o null
 */
window.verificarAccesoCliente = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        const bloqueo = await window.getClienteBloqueado?.(whatsapp);
        if (bloqueo) {
            console.warn('Cliente bloqueado, acceso denegado:', whatsapp);
            return null;
        }
        console.log('🔍 Verificando acceso para:', whatsapp, 'negocio:', negocioId);
        
        // Buscar si ya existe como cliente
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`,
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

        // Si existe, devolverlo
        if (data && data.length > 0) {
            // Una pendiente NO puede devolverse como null: quien llama a esto
            // interpreta null como "no existe", intenta crearla, crearCliente la
            // encuentra ya creada y la devuelve — y terminaria entrando igual.
            // Por eso vuelve la fila entera, marcada, y quien llama decide.
            console.log('✅ Cliente encontrado:', data[0]);
            return marcarSiPendiente(data[0]);
        }

        console.log('📝 Cliente no encontrado');
        return null;

    } catch (error) {
        console.error('Error en verificarAccesoCliente:', error);
        return null;
    }
};

/**
 * Crea un nuevo cliente en la base de datos
 * @param {string} nombre - Nombre completo del cliente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente creado
 */
window.crearCliente = async function(nombre, whatsapp) {
    try {
        const negocioId = getNegocioId();
        const bloqueo = await window.getClienteBloqueado?.(whatsapp);
        if (bloqueo) {
            console.warn('Cliente bloqueado, no se puede crear:', whatsapp);
            window.ultimoErrorCliente = 'Este numero no tiene permiso para registrarse.';
            return null;
        }
        console.log('➕ Creando nuevo cliente:', { nombre, whatsapp, negocio: negocioId });
        
        // PRIMERO: Verificar si ya existe en ESTE negocio
        const checkUrl = `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`;
        console.log('🔍 Verificando existencia:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            if (existing && existing.length > 0) {
                console.log('✅ Cliente ya existe en este negocio:', existing[0]);
                return marcarSiPendiente(existing[0]);
            }
        }

        // SEGUNDO: Si no existe, CREARLO
        console.log('📝 Cliente no existe en este negocio, creando...');

        const apruebaAMano = await window.negocioApruebaClientesAMano();

        const datosCliente = {
            negocio_id: negocioId,
            nombre: nombre,
            whatsapp: whatsapp,
            fecha_registro: new Date().toISOString()
        };
        // fecha_aprobacion tiene valor por defecto en la base (por eso todas las
        // filas viejas la traen puesta aunque este codigo nunca la mandara). Para
        // dejar a la clienta pendiente hay que mandar null explicito y pisar ese
        // default; si el salon no pide aprobacion no se manda nada y el default
        // hace lo de siempre.
        if (apruebaAMano) datosCliente.fecha_aprobacion = null;

        const createResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(datosCliente)
            }
        );
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Error al crear cliente:', {
                status: createResponse.status,
                statusText: createResponse.statusText,
                error: errorText
            });
            
            // Si es 409, puede ser un falso positivo, intentar obtener el cliente de nuevo
            if (createResponse.status === 409) {
                console.log('⚠️ Conflicto 409, intentando recuperar cliente existente...');
                
                const retryResponse = await fetch(checkUrl, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData && retryData.length > 0) {
                        console.log('✅ Cliente recuperado después del conflicto:', retryData[0]);
                        return marcarSiPendiente(retryData[0]);
                    }
                }
            }

            return null;
        }

        const nuevoCliente = await createResponse.json();
        console.log('✅ Cliente creado exitosamente:', nuevoCliente);

        return marcarSiPendiente(nuevoCliente);
        
    } catch (error) {
        console.error('❌ Error en crearCliente:', error);
        return null;
    }
};

/**
 * Actualiza el nombre de un cliente existente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @param {string} nuevoNombre - Nuevo nombre del cliente
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
window.actualizarNombreCliente = async function(whatsapp, nuevoNombre) {
    try {
        const negocioId = getNegocioId();
        console.log('✏️ Actualizando nombre de cliente:', { whatsapp, nuevoNombre, negocio: negocioId });
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ nombre: nuevoNombre })
            }
        );
        
        if (!response.ok) {
            console.error('Error actualizando nombre:', await response.text());
            return false;
        }
        
        console.log('✅ Nombre actualizado correctamente');
        return true;
        
    } catch (error) {
        console.error('Error en actualizarNombreCliente:', error);
        return false;
    }
};

/**
 * Verifica si un número está autorizado (alias para compatibilidad)
 */
window.isClienteAutorizado = async function(whatsapp) {
    const cliente = await window.verificarAccesoCliente(whatsapp);
    return !!cliente;
};

// ============================================
// FUNCIONES PARA EL PANEL DE ADMIN
// ============================================

/**
 * Obtiene todos los clientes registrados
 */
window.getClientesRegistrados = async function() {
    try {
        const negocioId = window.esperarNegocioId ? await window.esperarNegocioId() : getNegocioId();
        console.log('📋 Obteniendo clientes registrados para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&order=fecha_registro.desc`,
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
            return [];
        }
        
        const data = await response.json();
        console.log('✅ Clientes obtenidos:', data.length);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        return [];
    }
};

// Alias para compatibilidad con código existente
window.getClientesAutorizados = window.getClientesRegistrados;

/**
 * Elimina un cliente de la base de datos
 */
window.eliminarCliente = async function(whatsapp) {
    console.log('🗑️ Eliminando cliente:', whatsapp);
    
    try {
        const negocioId = getNegocioId();
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
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
            console.error('Error eliminando:', await response.text());
            return false;
        }
        
        console.log('✅ Cliente eliminado');
        return true;
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        return false;
    }
};

// Alias para compatibilidad
window.eliminarClienteAutorizado = window.eliminarCliente;

console.log('✅ auth-clients.js inicializado - MODO REGISTRO AUTOMÁTICO ACTIVADO');
