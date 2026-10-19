// cumple-duenas — avisa por ntfy a Raudael cuando hoy es el cumpleaños de una dueña de salon.
// Corre una vez al dia por pg_cron (ver sql-cumple-duenas-ntfy.sql), a las ~7 AM Cuba.
// La fecha de "hoy" es la de Cuba (America/Havana), igual que notificar-turnos.
// Prueba sin enviar nada: POST {"dry_run": true} (opcional "fecha": "AAAA-MM-DD").

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fechaCuba(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

// Los encabezados HTTP solo admiten ASCII; el cuerpo del mensaje si lleva tildes.
function ascii(text: string): string {
  return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const topic = (Deno.env.get("NTFY_TOPIC_GLOBAL") || "rservas-vencimientos").trim();
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Variables no configuradas" }, 503);

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.fecha || "")) ? String(body.fecha) : fechaCuba();
  const mes = Number(fecha.slice(5, 7));
  const dia = Number(fecha.slice(8, 10));

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const res = await fetch(
    `${supabaseUrl}/rest/v1/negocios?cumple_admin_dia=eq.${dia}&cumple_admin_mes=eq.${mes}&select=nombre,telefono,slug,codigo_pais&order=nombre.asc`,
    { headers },
  );
  if (!res.ok) return jsonResponse({ error: "Error consultando negocios", detalle: await res.text() }, 500);
  const duenas: Array<{ nombre: string; telefono: string | null; slug: string | null }> = await res.json();

  if (!duenas.length) return jsonResponse({ ok: true, fecha, cumpleanos: 0 });
  if (dryRun) return jsonResponse({ ok: true, fecha, dry_run: true, cumpleanos: duenas.length, negocios: duenas.map((d) => d.nombre) });

  const lineas = duenas.map((d, i) => {
    const tel = String(d.telefono || "").replace(/\D/g, "");
    return `${i + 1}. ${d.nombre}${tel ? `\n   WhatsApp: https://wa.me/${tel}` : ""}`;
  });
  const cuerpo = `Hoy cumple anos la duena de:\n\n${lineas.join("\n\n")}\n\nTiene 30% de descuento en su suscripcion este mes (si aun no se le aplico este ano).`;
  const title = ascii(duenas.length === 1 ? `Cumpleanos hoy: ${duenas[0].nombre}` : `Cumpleanos hoy: ${duenas.length} duenas de salon`);

  const envio = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: cuerpo,
    headers: { Title: title, Priority: "high", Tags: "birthday" },
  });
  if (!envio.ok) return jsonResponse({ error: `ntfy respondio ${envio.status}`, fecha, cumpleanos: duenas.length }, 502);
  return jsonResponse({ ok: true, fecha, cumpleanos: duenas.length, enviado: true });
});
