// Cuentas de la tarjeta de fidelidad para la funcion avisos-fidelidad. Son las MISMAS que hace la app
// (utils/turnos.js agruparTurnos + utils/fidelizacion.js tarjetaFidelizacion); estan copiadas aqui porque una
// Edge Function solo empaqueta lo que vive en su carpeta. tests/avisos-fidelidad.test.js compara las dos
// versiones con los mismos casos: si alguien cambia una, la prueba falla hasta que cambie la otra.

const aMin = (hora) => {
  const p = String(hora || "").split(":");
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
};
const digitos = (v) => String(v || "").replace(/\D/g, "");
const finDeFila = (f) => {
  const inicio = aMin(f.hora_inicio);
  const porHoras = f.hora_fin ? aMin(f.hora_fin) - inicio : 0;
  return inicio + (porHoras > 0 ? porHoras : (parseInt(f.duracion, 10) || 60));
};

// Una visita = filas seguidas de la misma clienta, dia y estado (un combo de 3 servicios cuenta UNA vez).
export function agruparCitas(filas) {
  const ordenadas = (filas || [])
    .filter((f) => f && f.id != null && f.hora_inicio)
    .sort((a, b) =>
      String(a.fecha || "").localeCompare(String(b.fecha || ""))
      || digitos(a.cliente_whatsapp).localeCompare(digitos(b.cliente_whatsapp))
      || aMin(a.hora_inicio) - aMin(b.hora_inicio)
      || String(a.id).localeCompare(String(b.id)));
  const grupos = [];
  ordenadas.forEach((fila) => {
    const grupo = grupos[grupos.length - 1];
    const anterior = grupo && grupo[grupo.length - 1];
    const seguida = anterior
      && digitos(anterior.cliente_whatsapp) === digitos(fila.cliente_whatsapp)
      && anterior.fecha === fila.fecha
      && anterior.estado === fila.estado
      && finDeFila(anterior) === aMin(fila.hora_inicio);
    if (seguida) grupo.push(fila); else grupos.push([fila]);
  });
  return grupos.map((filasDelGrupo) => ({ id: filasDelGrupo[0].id, filas: filasDelGrupo }));
}

// El ajuste manual de la duena se guarda en FILAS: descuenta las mas viejas. Una cita queda fuera si todas
// sus filas cayeron dentro del ajuste.
export function citasContadas(citas, ajusteFilas) {
  let saltar = Math.max(0, parseInt(ajusteFilas, 10) || 0);
  const contadas = [];
  (citas || []).forEach((cita) => {
    const filas = cita.filas || [cita];
    if (saltar >= filas.length) { saltar -= filas.length; return; }
    contadas.push(cita);
    saltar = 0;
  });
  return contadas;
}

export function configFidelidad(negocio) {
  const cada = Math.max(1, parseInt(negocio?.fidelizacion_cada_citas, 10) || 5);
  const pct = Math.max(0, Math.min(100, Number(negocio?.fidelizacion_descuento_porcentaje) || 0));
  return { activa: negocio?.fidelizacion_activa === true && pct > 0, ciclo: cada + 1, pct };
}

// { visitas, faltan, premiada }: faltan = citas completadas que faltan para el descuento.
export function estadoTarjeta(negocio, citas, ajusteFilas) {
  const fid = configFidelidad(negocio);
  if (!fid.activa) return { activa: false };
  const visitas = citasContadas(citas, ajusteFilas).length;
  const posicion = (visitas + 1) % fid.ciclo;
  const faltan = posicion === 0 ? 0 : fid.ciclo - posicion;
  return { activa: true, pct: fid.pct, visitas, faltan, premiada: faltan === 0 };
}

// Que avisar: solo cuando le falta 1 o ya tiene el descuento. Con el resto no se molesta a nadie.
export function textoAviso(tarjeta, nombreNegocio, nombreClienta) {
  const nombre = String(nombreClienta || "").trim().split(/\s+/)[0];
  const hola = nombre ? `${nombre}, ` : "";
  if (tarjeta.premiada) {
    return {
      tipo: "premiada",
      title: `🎁 ¡Tu próxima cita en ${nombreNegocio} tiene ${tarjeta.pct}% de descuento!`,
      body: `${hola}completaste tu tarjeta de fidelidad. Reserva tu cita y el descuento se aplica al cobrar. 💗`,
    };
  }
  if (tarjeta.faltan === 1) {
    return {
      tipo: "falta1",
      title: `💗 ¡Solo te falta 1 cita en ${nombreNegocio}!`,
      body: `${hola}completa 1 cita más y la siguiente tendrá ${tarjeta.pct}% de descuento. ¡Ya casi!`,
    };
  }
  return null;
}
