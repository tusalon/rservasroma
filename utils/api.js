// utils/api.js - Versión genérica para profesionales (CORREGIDO)

console.log('📡 api.js cargado');

// Usar variable global o definir si no existe
if (typeof window.TABLE_NAME === 'undefined') {
    window.TABLE_NAME = 'reservas';
}
const TABLE_NAME = window.TABLE_NAME;

const normalizeTimeKey = (value) => String(value || '').slice(0, 5);

// getNegocioId() la define utils/config-negocio-master.js (window.getNegocioId),
// cargado antes que este archivo en todas las paginas que lo usan.

/**
 * Fetch all bookings for a specific date
 */
async function getBookingsByDate(dateStr) {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Solicitando turnos a Supabase para', dateStr, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&fecha=eq.${dateStr}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

/**
 * Fetch bookings for a specific date AND profesional
 */
async function getBookingsByDateAndProfesional(dateStr, profesionalId, servicio) {
    try {
        const negocioId = getNegocioId();
        console.log(`🌐 Solicitando turnos para ${dateStr} del profesional ${profesionalId} (negocio: ${negocioId})`);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&fecha=eq.${dateStr}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        // Horas guardadas a otra clienta de la lista de espera (30 min): ocupadas para las demas.
        const retenidas = (await window.listaEspera?.retenidas?.(dateStr) || [])
            .filter(r => String(r.profesional_id) === String(profesionalId))
            .map(r => ({ hora_inicio: r.hora_inicio, hora_fin: r.hora_fin, estado: 'Retenida', retenida_lista_espera: true }));
        const propias = (Array.isArray(data) ? data : []).concat(retenidas);
        // Con espacios activos suma los tramos en que todos sus espacios estan tomados (utils/espacios.js).
        return (await window.espacios?.reservasConEspacios(profesionalId, dateStr, dateStr, propias, null, servicio)) ?? propias;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

/**
 * Create a new booking
 */
async function createBooking(bookingData) {
    try {
        const negocioId = getNegocioId();
        const bloqueo = await window.getClienteBloqueado?.(bookingData.cliente_whatsapp);
        if (bloqueo) {
            const error = new Error('Este cliente no tiene permiso para reservar.');
            error.code = 'CLIENTE_BLOQUEADO';
            throw error;
        }

        // Segunda llave, en el mismo cuello de botella que la lista negra: si el
        // salon aprueba a mano, una clienta pendiente no reserva aunque llegue al
        // formulario por otro camino (enlace directo, sesion vieja en el celular).
        const acceso = await window.verificarAccesoCliente?.(bookingData.cliente_whatsapp);
        if (acceso?.pendiente) {
            const error = new Error('Tu solicitud todavia esta esperando la aprobacion del salon.');
            error.code = 'CLIENTE_PENDIENTE';
            throw error;
        }
        
        const dataForSupabase = {
            negocio_id: negocioId,
            cliente_nombre: bookingData.cliente_nombre,
            cliente_whatsapp: bookingData.cliente_whatsapp,
            servicio: bookingData.servicio,
            duracion: bookingData.duracion,
            profesional_id: bookingData.trabajador_id || bookingData.profesional_id,
            profesional_nombre: bookingData.trabajador_nombre || bookingData.profesional_nombre,
            fecha: bookingData.fecha,
            hora_inicio: bookingData.hora_inicio,
            hora_fin: bookingData.hora_fin,
            estado: bookingData.estado || 'Reservado'
        };

        // Diseno del catalogo (ver sql-catalogo-disenos.sql). Se anaden SOLO si
        // la clienta eligio uno: asi una app publicada antes de correr el SQL
        // sigue reservando normal en vez de romper con "column does not exist".
        if (bookingData.diseno_titulo) {
            dataForSupabase.diseno_titulo = bookingData.diseno_titulo;
            dataForSupabase.diseno_imagen_url = bookingData.diseno_imagen_url || null;
        }

        console.log('📤 Enviando a Supabase:', dataForSupabase);

        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify(dataForSupabase)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            // 23P01 = exclusion (solape de horario), 23505 = unique (duplicado exacto).
            // Los genera la proteccion anti doble-reserva de la base (sql-anti-doble-reserva.sql).
            if (response.status === 409 || errorText.includes('23P01') || errorText.includes('23505')) {
                const conflicto = new Error('Ese horario acaba de ser tomado por otra persona. Elige otro horario.');
                conflicto.code = 'HORARIO_OCUPADO';
                throw conflicto;
            }
            throw new Error('Error creating booking');
        }
        
        const newBooking = await response.json();
        console.log('✅ Reserva creada exitosamente:', newBooking);
        
        return { success: true, data: newBooking[0] };
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
    }
}

/**
 * Fetch all bookings (for admin)
 */
async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Solicitando todas las reservas a Supabase para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching all bookings');
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        return [];
    }
}

/**
 * Update booking status
 */
async function updateBookingStatus(id, newStatus) {
    try {
        const negocioId = getNegocioId();
        console.log(`📝 Actualizando reserva ${id} a estado ${newStatus} (negocio: ${negocioId})`);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify({ estado: newStatus })
            }
        );
        
        if (!response.ok) throw new Error('Error updating booking');
        
        console.log('✅ Estado actualizado');
        return { success: true };
    } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
    }
}

// La lista de espera ya no se anota ni se avisa desde aqui (07-11-2026): la clienta usa
// window.listaEspera (utils/lista-espera.js) y la base ofrece las horas liberadas sola
// (sql-lista-espera-dia.sql + funcion lista-espera). Esto queda para los sitios que aun lo llaman al
// cancelar o mover una cita: solo refresca los avisos del panel.
async function notificarListaEsperaTurnoLiberado() {
    window.dispatchEvent(new CustomEvent('rservas:lista-espera-cambio'));
    return false;
}

// Hacer funciones globales
window.getBookingsByDate = getBookingsByDate;
window.getBookingsByDateAndProfesional = getBookingsByDateAndProfesional;
window.getBookingsByDateAndWorker = getBookingsByDateAndProfesional;
window.createBooking = createBooking;
window.getAllBookings = getAllBookings;
window.updateBookingStatus = updateBookingStatus;
window.notificarListaEsperaTurnoLiberado = notificarListaEsperaTurnoLiberado;

console.log('✅ api.js funciones disponibles');
