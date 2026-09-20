// utils/auth-profesionales.js - Autenticación para profesionales (CORREGIDO)

console.log('👤 auth-profesionales.js cargado');

// getNegocioId() la define utils/config-negocio-master.js (window.getNegocioId),
// cargado antes que este archivo en todas las paginas que lo usan.

// ============================================
// FUNCIONES DE AUTENTICACIÓN PARA PROFESIONALES
// ============================================

// profesionales.telefono NO se guarda siempre igual: la del mismo pais que el
// salon se guarda LOCAL (54349239) y la que vive fuera, INTERNACIONAL completa
// (97466438320). Esa regla vive en telefonoGuardadoDeProfesional (phone-utils),
// que es la que usa el panel al guardar la ficha.
//
// Aqui se LLAMA a esa misma funcion en vez de repetirla. Antes habia una copia
// y se desincronizaron: el panel aprendio a guardar numeros de otro pais y el
// login siguio dando por hecho que todo el mundo era del pais del salon. Yanela
// (Divine Touch, vive en Qatar) tecleaba su numero de alla y no entraba.
//
// codigoPaisProfesional es el pais que ELLA elige en la pantalla de entrada.
// Si no viene, se asume el del salon, que es el caso de 377 de las 381.
function telefonoLocalParaLogin(telefono, codigoPais, codigoPaisProfesional) {
    const codigoSalon = String(codigoPais || '').replace(/\D/g, '');

    if (codigoSalon && window.telefonoGuardadoDeProfesional) {
        return window.telefonoGuardadoDeProfesional(
            telefono,
            codigoPaisProfesional || codigoSalon,
            codigoSalon
        );
    }

    // Sin pais conocido (login desde la app de clientas, con el negocio ya en
    // sesion): se mantiene el camino de siempre.
    if (window.normalizarTelefonoLocal) return window.normalizarTelefonoLocal(telefono);
    return String(telefono || '').replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '');
}

// opciones.negocioId / opciones.codigoPais: admin-login.html entra por aqui
// ANTES de que exista sesion, asi que no puede resolver el negocio solo. Sin
// esos datos el login se hace desde la app de clientas, donde el negocio ya
// esta en sesion y se resuelve como siempre.
window.loginProfesional = async function(telefono, password, opciones = {}) {
    try {
        const negocioId = opciones.negocioId || getNegocioId();
        const telefonoLimpio = telefonoLocalParaLogin(telefono, opciones.codigoPais, opciones.codigoPaisProfesional);
        const passwordLimpio = String(password || '').trim();
        if (!negocioId || !telefonoLimpio || !passwordLimpio) {
            return null;
        }
        console.log('🔐 Intentando login de profesional:', telefono, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/rpc/login_profesional`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_negocio_id: negocioId,
                    p_telefono: telefonoLimpio,
                    p_password: passwordLimpio
                })
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }
        
        let data = await response.json();
        console.log('📋 Resultado login:', data);
        
        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Error en loginProfesional:', error);
        return null;
    }
};

window.verificarProfesionalPorTelefono = async function(telefono) {
    try {
        const negocioId = getNegocioId();
        const telefonoLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(telefono)
            : String(telefono || '').replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '');
        if (!negocioId || !telefonoLimpio) {
            return null;
        }
        console.log('🔍 Verificando si es profesional (solo teléfono):', telefono, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${encodeURIComponent(negocioId)}&telefono=eq.${encodeURIComponent(telefonoLimpio)}&activo=eq.true&select=id,nombre,telefono,nivel`,
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
        console.log('📋 Resultado verificación:', data);
        
        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Error verificando profesional:', error);
        return null;
    }
};

window.getProfesionalAutenticado = function() {
    const auth = localStorage.getItem('profesionalAuth');
    const sesionVigente = window.sesionPanelVigente('profesionalLoginTime');
    if (!sesionVigente) {
        localStorage.removeItem('profesionalAuth');
        localStorage.removeItem('profesionalLoginTime');
        return null;
    }
    if (auth) {
        try {
            return JSON.parse(auth);
        } catch (e) {
            return null;
        }
    }
    return null;
};

// ============================================
// FUNCIONES PARA OBTENER ROL
// ============================================

window.obtenerRolUsuario = async function(telefono) {
    try {
        const negocioId = getNegocioId();
        console.log('🔍 Obteniendo rol para:', telefono, 'negocio:', negocioId);
        
        const telefonoLimpio = telefono.replace(/\D/g, '');
        
        // Verificar si es PROFESIONAL
        const profesionalRes = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&telefono=eq.${telefonoLimpio}&activo=eq.true&select=id,nombre,nivel`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (profesionalRes.ok) {
            const profesionales = await profesionalRes.json();
            if (profesionales && profesionales.length > 0) {
                console.log('👨‍🎨 Es profesional:', profesionales[0].nombre);
                return {
                    rol: 'profesional',
                    id: profesionales[0].id,
                    nombre: profesionales[0].nombre,
                    nivel: profesionales[0].nivel || 1
                };
            }
        }
        
        return {
            rol: 'cliente',
            nombre: null
        };
        
    } catch (error) {
        console.error('Error obteniendo rol:', error);
        return { rol: 'cliente' };
    }
};

window.tieneAccesoPanel = async function(telefono) {
    const rol = await window.obtenerRolUsuario(telefono);
    return rol.rol === 'admin' || rol.rol === 'profesional';
};

// ============================================
// FUNCIONES PARA RESERVAS DE PROFESIONALES
// ============================================

window.getReservasPorProfesional = async function(profesionalId, soloActivas = true) {
    try {
        const negocioId = getNegocioId();
        console.log(`📋 Obteniendo reservas para profesional ${profesionalId} (negocio: ${negocioId})`);
        
        let url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${profesionalId}&order=fecha.desc,hora_inicio.asc`;
        
        if (soloActivas) {
            url += '&estado=neq.Cancelado';
        }
        
        const response = await fetch(
            url,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        return [];
    }
};

// Alias para compatibilidad
window.getReservasPorBarbero = window.getReservasPorProfesional;
