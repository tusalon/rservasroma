// recordatorio-cliente - push a la clienta 24h antes y 1 hora antes de su cita.
// Usa enviar-web-push para cubrir PWA Web Push y FCM nativo.
// Tipos:
//   - "24h": citas que empiezan entre ahora+23h50m y ahora+24h30m.
//   - "hora": citas que empiezan entre ahora+50m y ahora+90m.
//   - "dia": compatibilidad legacy; envia a turnos de manana cuando corre la noche anterior.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getHavanaDate(offsetDays = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const base = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function formatHavanaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatHavanaTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: "America/Havana",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hora12(timeStr: string): string {
  const [h, m] = String(timeStr || "00:00").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

function buildWindowQuery({
  supabaseUrl,
  flagCampo,
  fromMinutes,
  toMinutes,
}: {
  supabaseUrl: string;
  flagCampo: string;
  fromMinutes: number;
  toMinutes: number;
}) {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() + fromMinutes * 60000);
  const hasta = new Date(ahora.getTime() + toMinutes * 60000);
  const fechaDesde = formatHavanaDate(desde);
  const fechaHasta = formatHavanaDate(hasta);
  const horaDesde = formatHavanaTime(desde);
  const horaHasta = formatHavanaTime(hasta);
  const select = "id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,fecha,hora_inicio,profesional_nombre";

  if (fechaDesde === fechaHasta) {
    return `${supabaseUrl}/rest/v1/reservas?fecha=eq.${fechaDesde}&estado=neq.Cancelado&${flagCampo}=eq.false&hora_inicio=gte.${horaDesde}&hora_inicio=lte.${horaHasta}&select=${select}`;
  }

  return `${supabaseUrl}/rest/v1/reservas?estado=neq.Cancelado&${flagCampo}=eq.false&or=(and(fecha.eq.${fechaDesde},hora_inicio.gte.${horaDesde}),and(fecha.eq.${fechaHasta},hora_inicio.lte.${horaHasta}))&select=${select}`;
}

function clienteUrl(negocio: any): string {
  if (negocio?.sitio_web) return negocio.sitio_web;
  if (negocio?.slug) return `https://tusalon.github.io/rservasroma/?s=${encodeURIComponent(negocio.slug)}`;
  return "https://tusalon.github.io/rservasroma/";
}

function buildMessage(tipo: string, reserva: any, nombreNegocio: string) {
  const hora = hora12(reserva.hora_inicio);
  const profesional = reserva.profesional_nombre ? ` con ${reserva.profesional_nombre}` : "";

  if (tipo === "hora") {
    return {
      title: `Tu cita es en 1 hora - ${nombreNegocio}`,
      body: `${reserva.cliente_nombre || "Hola"}, tienes ${reserva.servicio || "tu turno"}${profesional} a las ${hora}. Nos vemos pronto!`,
    };
  }

  if (tipo === "dia") {
    return {
      title: `Recordatorio para manana - ${nombreNegocio}`,
      body: `Hola ${reserva.cliente_nombre || ""}! Manana tienes ${reserva.servicio || "tu turno"}${profesional} a las ${hora}. Te esperamos!`,
    };
  }

  return {
    title: `Recordatorio 24h - ${nombreNegocio}`,
    body: `Hola ${reserva.cliente_nombre || ""}! En 24 horas tienes ${reserva.servicio || "tu turno"}${profesional} a las ${hora}. Te esperamos!`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Variables no configuradas" }, 503);
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const body = await req.json().catch(() => ({}));
  const tipoRaw = String(body?.tipo || "24h").toLowerCase();
  const tipo = ["hora", "1h"].includes(tipoRaw) ? "hora" : (["dia", "manana"].includes(tipoRaw) ? "dia" : "24h");
  const negocioFiltro = body?.negocio_id || null;
  const dryRun = body?.dry_run === true;

  let reservasUrl = "";
  let flagCampo = "";

  if (tipo === "dia") {
    const manana = getHavanaDate(1);
    flagCampo = "push_recordatorio_dia_enviado";
    reservasUrl = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${manana}&estado=neq.Cancelado&${flagCampo}=eq.false&select=id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,fecha,hora_inicio,profesional_nombre`;
  } else if (tipo === "hora") {
    flagCampo = "push_recordatorio_hora_enviado";
    reservasUrl = buildWindowQuery({ supabaseUrl, flagCampo, fromMinutes: 50, toMinutes: 90 });
  } else {
    flagCampo = "push_recordatorio_dia_enviado";
    reservasUrl = buildWindowQuery({ supabaseUrl, flagCampo, fromMinutes: (24 * 60) - 10, toMinutes: (24 * 60) + 30 });
  }

  if (negocioFiltro) reservasUrl += `&negocio_id=eq.${negocioFiltro}`;

  const resReservas = await fetch(reservasUrl, { headers });
  if (!resReservas.ok) return jsonResponse({ error: "Error consultando reservas", detalle: await resReservas.text() }, 500);
  const reservas = await resReservas.json();

  if (!reservas.length) return jsonResponse({ ok: true, tipo, enviados: 0, mensaje: "Sin turnos pendientes" });

  const negocioIds = [...new Set(reservas.map((r: any) => r.negocio_id).filter(Boolean))];
  const negociosRes = await fetch(`${supabaseUrl}/rest/v1/negocios?id=in.(${negocioIds.join(",")})&select=id,nombre,sitio_web,slug`, { headers });
  const negocios = negociosRes.ok ? await negociosRes.json() : [];
  const negociosById: Record<string, any> = Object.fromEntries(negocios.map((n: any) => [n.id, n]));

  let enviados = 0;
  let sinWhatsapp = 0;
  let sinSuscripcion = 0;
  const notificadosIds: number[] = [];
  const errores: string[] = [];

  for (const reserva of reservas) {
    if (!reserva.cliente_whatsapp) {
      sinWhatsapp++;
      continue;
    }

    const negocio = negociosById[reserva.negocio_id] || {};
    const nombreNegocio = negocio.nombre || "Tu salon";
    const url = clienteUrl(negocio);
    const msg = buildMessage(tipo, reserva, nombreNegocio);

    if (dryRun) continue;

    try {
      const pushRes = await fetch(`${supabaseUrl}/functions/v1/enviar-web-push`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          negocio_id: reserva.negocio_id,
          cliente_whatsapp: reserva.cliente_whatsapp,
          role: "cliente",
          title: msg.title,
          body: msg.body,
          url,
          tags: `recordatorio-cliente-${tipo}`,
          data: {
            tipo: "recordatorio_cliente",
            recordatorio: tipo,
            reserva_id: String(reserva.id),
            fecha: reserva.fecha,
            hora_inicio: reserva.hora_inicio,
          },
        }),
      });

      const pushData = await pushRes.json().catch(() => ({}));
      if (!pushRes.ok) throw new Error(pushData?.error || await pushRes.text());

      if (Number(pushData?.sent || 0) > 0) {
        enviados += Number(pushData.sent || 0);
        notificadosIds.push(reserva.id);
      } else {
        sinSuscripcion++;
      }
    } catch (err: any) {
      errores.push(`${reserva.cliente_nombre || reserva.id}: ${err?.message || err}`);
    }
  }

  const idsUnicos = [...new Set(notificadosIds)];
  if (!dryRun && idsUnicos.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/reservas?id=in.(${idsUnicos.join(",")})`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ [flagCampo]: true }),
    });
  }

  return jsonResponse({
    ok: true,
    tipo,
    dry_run: dryRun,
    total: reservas.length,
    enviados,
    notificados: dryRun ? 0 : idsUnicos.length,
    sin_whatsapp: sinWhatsapp,
    sin_suscripcion: sinSuscripcion,
    errores: errores.length ? errores : undefined,
  });
});
