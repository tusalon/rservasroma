// resumen-turnos-push - resumen diario por push para admin y profesionales.
// tipo "hoy": agenda del dia actual en America/Havana.
// tipo "manana": agenda del dia siguiente en America/Havana.

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

function getCubaDate(offsetDays = 0): string {
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

function hora12(timeStr = ""): string {
  const [hRaw, mRaw] = timeStr.split(":").map(Number);
  const h = Number.isFinite(hRaw) ? hRaw : 0;
  const m = Number.isFinite(mRaw) ? mRaw : 0;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fechaBonita(fecha: string, tipo: string): string {
  if (tipo === "hoy") return "hoy";
  if (tipo === "manana") return "manana";
  return fecha;
}

function lineasResumen(turnos: any[], incluirProfesional: boolean): string {
  const ordenados = [...turnos].sort((a, b) => String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));
  const visibles = ordenados.slice(0, 8).map((r) => {
    const profesional = r.profesional_nombre || r.trabajador_nombre || r.barbero_nombre || "Sin profesional";
    const base = `${hora12(r.hora_inicio)} - ${r.cliente_nombre || "Cliente"} - ${r.servicio || "Servicio"}`;
    return incluirProfesional ? `${base} - ${profesional}` : base;
  });
  const restantes = ordenados.length - visibles.length;
  if (restantes > 0) visibles.push(`Y ${restantes} turno${restantes === 1 ? "" : "s"} mas`);
  return visibles.join("\n");
}

async function yaEnviado({
  supabaseUrl,
  headers,
  negocioId,
  role,
  profesionalId,
  fecha,
  tipo,
}: {
  supabaseUrl: string;
  headers: Record<string, string>;
  negocioId: string;
  role: string;
  profesionalId: string | number | null;
  fecha: string;
  tipo: string;
}) {
  const url = new URL(`${supabaseUrl}/rest/v1/push_resumenes_enviados`);
  url.searchParams.set("negocio_id", `eq.${negocioId}`);
  url.searchParams.set("role", `eq.${role}`);
  url.searchParams.set("fecha_resumen", `eq.${fecha}`);
  url.searchParams.set("tipo", `eq.${tipo}`);
  url.searchParams.set("select", "id");
  url.searchParams.set("limit", "1");
  if (profesionalId) url.searchParams.set("profesional_id", `eq.${profesionalId}`);
  else url.searchParams.set("profesional_id", "is.null");

  const response = await fetch(url, { headers });
  if (!response.ok) return false;
  const rows = await response.json();
  return rows.length > 0;
}

async function marcarEnviado({
  supabaseUrl,
  headers,
  negocioId,
  role,
  profesionalId,
  fecha,
  tipo,
  totalTurnos,
  sent,
}: {
  supabaseUrl: string;
  headers: Record<string, string>;
  negocioId: string;
  role: string;
  profesionalId: string | number | null;
  fecha: string;
  tipo: string;
  totalTurnos: number;
  sent: number;
}) {
  await fetch(`${supabaseUrl}/rest/v1/push_resumenes_enviados`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      negocio_id: negocioId,
      role,
      profesional_id: profesionalId || null,
      fecha_resumen: fecha,
      tipo,
      total_turnos: totalTurnos,
      sent_count: sent,
      sent_at: new Date().toISOString(),
    }),
  });
}

async function enviarWebPush({
  supabaseUrl,
  serviceKey,
  payload,
}: {
  supabaseUrl: string;
  serviceKey: string;
  payload: Record<string, unknown>;
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/enviar-web-push`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`enviar-web-push fallo: ${JSON.stringify(result)}`);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Variables de entorno no configuradas" }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const tipo = body?.tipo === "manana" ? "manana" : "hoy";
  const fecha = tipo === "manana" ? getCubaDate(1) : getCubaDate(0);
  const negocioFiltro = body?.negocio_id || null;
  const dryRun = Boolean(body?.dry_run);
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  let reservasUrl = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${fecha}&estado=neq.Cancelado&select=id,negocio_id,cliente_nombre,servicio,hora_inicio,profesional_id,profesional_nombre,trabajador_nombre,barbero_nombre`;
  if (negocioFiltro) reservasUrl += `&negocio_id=eq.${negocioFiltro}`;

  const reservasResponse = await fetch(reservasUrl, { headers });
  if (!reservasResponse.ok) return jsonResponse({ error: "Error consultando reservas" }, 500);
  const reservas = await reservasResponse.json();
  if (!reservas.length) {
    return jsonResponse({ ok: true, tipo, fecha, total_reservas: 0, enviados: 0, mensaje: "Sin turnos para resumir" });
  }

  const negocioIds = [...new Set(reservas.map((r: any) => r.negocio_id).filter(Boolean))];
  const negociosResponse = await fetch(
    `${supabaseUrl}/rest/v1/negocios?id=in.(${negocioIds.join(",")})&select=id,nombre,sitio_web,slug`,
    { headers },
  );
  const negocios = negociosResponse.ok ? await negociosResponse.json() : [];
  const negociosById: Record<string, any> = Object.fromEntries(negocios.map((n: any) => [n.id, n]));

  const porNegocio: Record<string, any[]> = {};
  for (const reserva of reservas) {
    if (!porNegocio[reserva.negocio_id]) porNegocio[reserva.negocio_id] = [];
    porNegocio[reserva.negocio_id].push(reserva);
  }

  let enviados = 0;
  let saltados = 0;
  const errores: string[] = [];

  for (const [negocioId, turnos] of Object.entries(porNegocio)) {
    const negocio = negociosById[negocioId] || {};
    const nombreNegocio = negocio.nombre || "RservasRoma";
    const urlAdmin = negocio.slug
      ? `https://tusalon.github.io/rservasroma/admin.html?s=${encodeURIComponent(negocio.slug)}`
      : "https://tusalon.github.io/rservasroma/admin.html";

    const destinos: Array<{ role: string; profesionalId: string | number | null; turnos: any[]; incluirProfesional: boolean }> = [
      { role: "admin", profesionalId: null, turnos, incluirProfesional: true },
    ];

    const porProfesional: Record<string, any[]> = {};
    for (const turno of turnos) {
      if (!turno.profesional_id) continue;
      const key = String(turno.profesional_id);
      if (!porProfesional[key]) porProfesional[key] = [];
      porProfesional[key].push(turno);
    }

    for (const [profesionalId, turnosProfesional] of Object.entries(porProfesional)) {
      destinos.push({ role: "profesional", profesionalId, turnos: turnosProfesional, incluirProfesional: false });
    }

    for (const destino of destinos) {
      const repetido = await yaEnviado({
        supabaseUrl,
        headers,
        negocioId,
        role: destino.role,
        profesionalId: destino.profesionalId,
        fecha,
        tipo,
      });
      if (repetido) {
        saltados++;
        continue;
      }

      const title = `${destino.role === "admin" ? nombreNegocio : "Tu agenda"}: ${destino.turnos.length} turno${destino.turnos.length === 1 ? "" : "s"} ${fechaBonita(fecha, tipo)}`;
      const pushPayload: Record<string, unknown> = {
        negocio_id: negocioId,
        role: destino.role,
        title,
        body: lineasResumen(destino.turnos, destino.incluirProfesional),
        url: urlAdmin,
        tags: tipo === "manana" ? "calendar" : "spiral_calendar",
        data: { tipo: "resumen-turnos", fecha, resumen_tipo: tipo },
        badge_count: destino.turnos.length,
      };
      if (destino.profesionalId) pushPayload.profesional_id = destino.profesionalId;

      try {
        const result = dryRun ? { ok: true, sent: 0, dry_run: true } : await enviarWebPush({ supabaseUrl, serviceKey, payload: pushPayload });
        const sent = Number(result?.sent || 0);
        enviados += sent;
        if (!dryRun) {
          await marcarEnviado({
            supabaseUrl,
            headers,
            negocioId,
            role: destino.role,
            profesionalId: destino.profesionalId,
            fecha,
            tipo,
            totalTurnos: destino.turnos.length,
            sent,
          });
        }
      } catch (error: any) {
        errores.push(`${negocioId}/${destino.role}/${destino.profesionalId || "all"}: ${error?.message || error}`);
      }
    }
  }

  return jsonResponse({
    ok: errores.length === 0,
    tipo,
    fecha,
    total_reservas: reservas.length,
    enviados,
    saltados,
    errores: errores.length ? errores : undefined,
  }, errores.length ? 207 : 200);
});
