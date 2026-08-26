// utils/frases-motivacionales.js
// Banco de frases sobre esfuerzo y vida para mostrarle a la duena del salon
// cuando abre el panel. Una por dia: se elige por el dia del anio, asi que
// es la misma todo el dia (no cambia al recargar) y rota sola sin guardar
// nada en la base.

const FRASES_MOTIVACIONALES = [
    'El esfuerzo de hoy es la clienta fija de mañana.',
    'No se trata de tener tiempo, se trata de hacer tiempo.',
    'Cada silla ocupada empezó siendo una cita que casi se cancela.',
    'La constancia vence al talento cuando el talento no es constante.',
    'Un mal día no borra un buen negocio.',
    'Lo que sostenés con esfuerzo, no se lo lleva la suerte.',
    'Nadie ve las horas extra, pero todos ven el resultado.',
    'El salón que cuidás hoy es el que te va a sostener mañana.',
    'Pequeños pasos todos los días valen más que un gran salto una vez al año.',
    'Cansada hoy, imparable mañana.',
    'Tu trabajo de hoy es la reputación que te van a recomendar.',
    'No compares tu comienzo con el final de otra.',
    'Cada clienta que se va contenta es publicidad que no pagaste.',
    'El esfuerzo no siempre se nota enseguida, pero nunca se pierde.',
    'Hacelo bien aunque nadie lo esté mirando hoy.',
    'Un día difícil es parte del mismo camino, no una señal para parar.',
    'Lo que hoy parece rutina, en un año es experiencia.',
    'La disciplina es la que aparece cuando las ganas ya se fueron.',
    'Nadie construyó una clientela fija en una sola semana.',
    'Cuidá tu energía como cuidás tu agenda.',
    'El descanso también es parte del trabajo bien hecho.',
    'Cada intento fallido te deja mejor preparada para el siguiente.',
    'Tu esfuerzo de hoy no se nota hasta que se acumula.',
    'Empezar de nuevo cada mañana también es un logro.',
    'La paciencia con el negocio es tan importante como la paciencia con la clienta.',
    'Nadie recuerda cuánto costó, solo cuánto valió.',
    'El que persiste, tarde o temprano, encuentra su lugar.',
    'Hoy también cuenta, aunque parezca un día cualquiera.',
    'Sembrás esfuerzo, cosechás resultados, aunque tarden.',
    'Un negocio que cuida a su gente, dura.'
];

function getDiaDelAnio(fecha) {
    const hoy = fecha || new Date();
    const inicio = new Date(hoy.getFullYear(), 0, 0);
    return Math.floor((hoy - inicio) / 86400000);
}

function getFraseDelDia(fecha) {
    const dia = getDiaDelAnio(fecha);
    return FRASES_MOTIVACIONALES[dia % FRASES_MOTIVACIONALES.length];
}

if (typeof window !== 'undefined') {
    window.getFraseDelDia = getFraseDelDia;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FRASES_MOTIVACIONALES, getDiaDelAnio, getFraseDelDia };
}
