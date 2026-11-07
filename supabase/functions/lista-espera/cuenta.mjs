// Cuentas puras de la funcion lista-espera (prueba en tests/lista-espera-funcion.test.js).

export const aMin = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
export const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function encajaFranja(franja, horaMin) {
  if (franja === "manana") return horaMin < 12 * 60;
  if (franja === "tarde") return horaMin >= 12 * 60;
  return true;
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

// La primera de la fila (ya viene por orden de llegada) que encaja en el hueco.
export function elegirCandidata(hueco, fin, esperan, haceServicio = () => true) {
  return (esperan || []).find((e) =>
    !hueco.rechazado.includes(e.id) &&
    (e.profesional_id == null || e.profesional_id === hueco.profesional_id) &&
    encajaFranja(e.franja, hueco.ini) &&
    (Number(e.duracion) || 30) <= fin - hueco.ini &&
    haceServicio(hueco.profesional_id, e.servicio)) || null;
}
