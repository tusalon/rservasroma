// Cuentas puras de la funcion lista-espera (prueba en tests/lista-espera-funcion.test.js).

export const aMin = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
export const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
export const diaDe = (fecha) => DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];

export function encajaFranja(franja, horaMin) {
  if (franja === "manana") return horaMin < 12 * 60;
  if (franja === "tarde") return horaMin >= 12 * 60;
  return true;
}

// Mismas reglas que servicioPermiteHorario de utils/timeLogic.js: horas permitidas del dia (o generales),
// "cerrado" ese dia, y "3:00" vale tambien como 15:00.
function variantes(h) {
  const [a, b] = String(h || "").trim().split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(a) || Number.isNaN(b)) return [];
  const v = [a * 60 + b];
  if (a >= 1 && a <= 7) v.push((a + 12) * 60 + b);
  return v;
}
export function permiteHora(servicio, horaMin, dia) {
  const porDia = servicio?.horarios_permitidos_por_dia?.[dia];
  if (porDia === "cerrado") return false;
  const lista = Array.isArray(porDia) && porDia.length ? porDia : (Array.isArray(servicio?.horarios_permitidos) ? servicio.horarios_permitidos : []);
  if (!lista.length) return true;
  return lista.some((h) => variantes(h).includes(horaMin));
}

// Los servicios de una espera, en orden: el combo si lo tiene, o el servicio suelto.
export function itemsDeEspera(e) {
  if (Array.isArray(e?.combo) && e.combo.length) return e.combo;
  return [{ servicio: e?.servicio, duracion: e?.duracion, profesional_id: e?.profesional_id }];
}

// Un combo con varias profesionales no se ofrece solo: lo gestiona la duena desde el panel.
export function comboVariasProfesionales(e) {
  const ids = new Set((Array.isArray(e?.combo) ? e.combo : []).map((x) => x.profesional_id).filter((x) => x != null));
  return ids.size > 1;
}

// Huecos de la misma profesional y dia que se tocan o pisan se juntan: un combo cancelado deja varias filas.
// Devuelve [{ fecha, profesional_id, ini, fin, ids, rechazado }] con minutos desde las 00:00.
export function juntarHuecos(lista) {
  const orden = [...(lista || [])].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.profesional_id - b.profesional_id || aMin(a.hora_inicio) - aMin(b.hora_inicio));
  const juntos = [];
  for (const h of orden) {
    const u = juntos[juntos.length - 1];
    if (u && u.fecha === h.fecha && u.profesional_id === h.profesional_id && aMin(h.hora_inicio) <= u.fin) {
      u.fin = Math.max(u.fin, aMin(h.hora_fin));
      u.ids.push(h.id);
      u.rechazado.push(...(h.rechazado_por || []));
    } else {
      juntos.push({ fecha: h.fecha, profesional_id: h.profesional_id, ini: aMin(h.hora_inicio), fin: aMin(h.hora_fin), ids: [h.id], rechazado: [...(h.rechazado_por || [])] });
    }
  }
  return juntos;
}

// Cuanto del hueco sigue libre. `ocupados`: [[inicio, fin]] de reservas activas y horas ya guardadas.
// null si algo pisa el inicio; si no, el fin libre (recortado por lo primero que empiece dentro).
export function finLibre(hueco, ocupados) {
  let fin = hueco.fin;
  for (const [i, f] of ocupados || []) {
    const a = aMin(i), b = aMin(f);
    if (a <= hueco.ini && b > hueco.ini) return null;
    if (a > hueco.ini && a < fin) fin = a;
  }
  return fin;
}

// ¿Esa profesional hace cada servicio de la espera, y cada uno acepta la hora en que le toca empezar?
// `servicios`: filas de la tabla servicios (nombre, horarios_permitidos...); `asignaciones`: servicios_profesionales.
export function encajaServicios(e, proId, iniMin, dia, servicios = [], asignaciones = []) {
  if (comboVariasProfesionales(e)) return false;
  let cursor = iniMin;
  for (const item of itemsDeEspera(e)) {
    const s = servicios.find((x) => x.nombre === item.servicio);
    if (s) {
      const de = asignaciones.filter((a) => a.servicio_id === s.id);
      if (de.length && !de.some((a) => a.profesional_id === proId)) return false;
      if (!permiteHora(s, cursor, dia)) return false;
    }
    cursor += Number(item.duracion) || 30;
  }
  return true;
}

// La primera de la fila (ya viene por orden de llegada) que encaja en el hueco.
// `encaja(espera, inicioMin)`: comprobacion extra de servicios (encajaServicios); por defecto todo vale.
export function elegirCandidata(hueco, fin, esperan, encaja = () => true) {
  return (esperan || []).find((e) =>
    !hueco.rechazado.includes(e.id) &&
    (e.profesional_id == null || e.profesional_id === hueco.profesional_id) &&
    encajaFranja(e.franja, hueco.ini) &&
    (Number(e.duracion) || 30) <= fin - hueco.ini &&
    encaja(e, hueco.ini)) || null;
}
