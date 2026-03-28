// utils/api.js - Versión ultra ligera con cache (ADAPTADA PARA BENETTSALON)

const SUPABASE_URL = 'https://torwzztbyeryptydytwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnd6enRieWVyeXB0eWR5dHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODAxNzIsImV4cCI6MjA4Njk1NjE3Mn0.yISCKznhbQt5UAW5lwSuG2A2NUS71GSbirhpa9mMpyI';

const TABLE_NAME = 'benettsalon';

// Cache en memoria
const cache = {
    bookingsByDate: new Map(),
    allBookings: null,
    allBookingsTimestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const STORAGE_CACHE_KEY = 'turnos_cache_v1';

/**
 * Fetch all bookings for a specific date
 */
async function getBookingsByDate(dateStr) {
    const cached = cache.bookingsByDate.get(dateStr);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('🗂️ Usando cache en memoria para', dateStr);
        return cached.data;
    }

    const stored = localStorage.getItem(`${STORAGE_CACHE_KEY}_${dateStr}`);
    if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < 60 * 60 * 1000) {
            console.log('💾 Usando cache localStorage para', dateStr);
            cache.bookingsByDate.set(dateStr, { data, timestamp: Date.now() });
            return data;
        }
    }

    try {
        console.log('🌐 Solicitando turnos para', dateStr);
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?fecha=eq.${dateStr}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                }
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        
        cache.bookingsByDate.set(dateStr, { data, timestamp: Date.now() });
        localStorage.setItem(`${STORAGE_CACHE_KEY}_${dateStr}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        if (stored) {
            const { data } = JSON.parse(stored);
            return data;
        }
        if (cached) {
            return cached.data;
        }
        return [];
    }
}

/**
 * 🔥 NUEVA: Fetch bookings for a specific date AND worker
 */
async function getBookingsByDateAndWorker(dateStr, workerId) {
    const cacheKey = `${dateStr}_worker_${workerId}`;
    const cached = cache.bookingsByDate.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`🗂️ Usando cache para trabajador ${workerId} en ${dateStr}`);
        return cached.data;
    }

    const stored = localStorage.getItem(`${STORAGE_CACHE_KEY}_${cacheKey}`);
    if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < 60 * 60 * 1000) {
            console.log(`💾 Usando localStorage para trabajador ${workerId}`);
            cache.bookingsByDate.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        }
    }

    try {
        console.log(`🌐 Solicitando turnos para ${dateStr} del trabajador ${workerId}`);
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?fecha=eq.${dateStr}&trabajador_id=eq.${workerId}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                }
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        
        cache.bookingsByDate.set(cacheKey, { data, timestamp: Date.now() });
        localStorage.setItem(`${STORAGE_CACHE_KEY}_${cacheKey}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        if (stored) {
            const { data } = JSON.parse(stored);
            return data;
        }
        if (cached) {
            return cached.data;
        }
        return [];
    }
}

/**
 * Create a new booking
 */
async function createBooking(bookingData) {
    try {
        const dataForSupabase = {
            cliente_nombre: bookingData.cliente_nombre,
            cliente_whatsapp: bookingData.cliente_whatsapp,
            servicio: bookingData.servicio,
            duracion: bookingData.duracion,
            trabajador_id: bookingData.trabajador_id,
            trabajador_nombre: bookingData.trabajador_nombre,
            fecha: bookingData.fecha,
            hora_inicio: bookingData.hora_inicio,
            hora_fin: bookingData.hora_fin,
            estado: bookingData.estado || 'Reservado',
            email: bookingData.email || null
        };

        console.log('📤 Enviando a Supabase:', dataForSupabase);

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(dataForSupabase)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error('Error creating booking');
        }
        
        const newBooking = await response.json();
        console.log('✅ Reserva creada exitosamente:', newBooking);
        
        // Limpiar cache específico
        const cacheKey = `${bookingData.fecha}_worker_${bookingData.trabajador_id}`;
        cache.bookingsByDate.delete(cacheKey);
        localStorage.removeItem(`${STORAGE_CACHE_KEY}_${cacheKey}`);
        
        // Limpiar cache general
        cache.bookingsByDate.delete(bookingData.fecha);
        localStorage.removeItem(`${STORAGE_CACHE_KEY}_${bookingData.fecha}`);
        cache.allBookings = null;
        
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
    if (cache.allBookings && (Date.now() - cache.allBookingsTimestamp) < CACHE_DURATION) {
        return cache.allBookings;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&order=fecha.desc,hora_inicio.asc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                }
            }
        );
        
        if (!response.ok) throw new Error('Error fetching all bookings');
        
        const data = await response.json();
        
        cache.allBookings = data;
        cache.allBookingsTimestamp = Date.now();
        
        return data;
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        return cache.allBookings || [];
    }
}

/**
 * Update booking status
 */
async function updateBookingStatus(id, newStatus) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: newStatus })
            }
        );
        
        if (!response.ok) throw new Error('Error updating booking');
        
        cache.bookingsByDate.clear();
        cache.allBookings = null;
        
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(STORAGE_CACHE_KEY)) {
                localStorage.removeItem(key);
            }
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
    }
}