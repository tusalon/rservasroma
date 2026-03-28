// utils/timeLogic.js - Versión con formato 12h (AM/PM)

// Helper to convert "HH:mm" to minutes since midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper to convert minutes since midnight to "HH:mm" (formato 24h para BD)
function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// NUEVA: Convertir hora 24h a formato 12h con AM/PM
function formatTo12Hour(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    hour12 = hour12 === 0 ? 12 : hour12; // 0 -> 12 AM
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// NUEVA: Convertir hora 12h a formato 24h (para procesamiento interno)
function parse12HourTo24Hour(timeStr, period) {
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Generar slots respetando bloques de horario (9-12 y 13-18) - Internamente usa 24h
function generateBaseSlots(durationMinutes) {
    const slots = [];
    
    // Bloque mañana: 9:00 a 12:00
    const morningStart = timeToMinutes("09:00");
    const morningEnd = timeToMinutes("12:00");
    
    // Bloque tarde: 13:00 a 18:00
    const afternoonStart = timeToMinutes("13:00");
    const afternoonEnd = timeToMinutes("18:00");
    
    // Generar slots en la mañana
    for (let current = morningStart; current + durationMinutes <= morningEnd; current += durationMinutes) {
        slots.push(minutesToTime(current));
    }
    
    // Generar slots en la tarde
    for (let current = afternoonStart; current + durationMinutes <= afternoonEnd; current += durationMinutes) {
        slots.push(minutesToTime(current));
    }
    
    return slots;
}

// Check if a slot is available considering existing bookings
function filterAvailableSlots(baseSlots, durationMinutes, existingBookings) {
    return baseSlots.filter(slotStartStr => {
        const slotStart = timeToMinutes(slotStartStr);
        const slotEnd = slotStart + durationMinutes;

        // Check against every existing booking
        const hasConflict = existingBookings.some(booking => {
            const bookingStart = timeToMinutes(booking.hora_inicio);
            const bookingEnd = timeToMinutes(booking.hora_fin);

            // Check for Overlap
            // Slot starts before booking ends AND Slot ends after booking starts
            return (slotStart < bookingEnd) && (slotEnd > bookingStart);
        });

        return !hasConflict;
    });
}

function calculateEndTime(startTimeStr, durationMinutes) {
    const startMins = timeToMinutes(startTimeStr);
    return minutesToTime(startMins + durationMinutes);
}