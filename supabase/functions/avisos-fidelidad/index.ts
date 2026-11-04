// avisos-fidelidad — avisa por push (fuera de la app) a la clienta cuando le falta 1 cita para su descuento
// de fidelidad o cuando su proxima cita ya lo lleva. Corre solo cada 15 min por pg_cron
// (sql-avisos-fidelidad.sql) y solo mira los salones que tienen la fidelizacion activa.
//
// Como no repite: la tabla fidelidad_avisos guarda (salon, clienta, total de citas completadas). Mientras
// ese total no cambie, no vuelve a avisar; cada cita nueva completada es un aviso nuevo posible.
// Prueba sin enviar nada: POST {"dry_run": true} (opcional "negocio_id").

import { agruparCitas, estadoTarjeta, textoAviso } from "./cuenta.mjs";

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

// Fecha de Cuba, igual que marcar_turnos_completados y recordatorio-cliente.
function fechaCuba(offsetDias = 0): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const base = new Date(`${p.year}-${p.month}-${p.day}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offsetDias);
  return base.toISOString().slice(0, 10);
}

const digitos = (v: unknown) => String(v || "").replace(/\D/g, "");

// La app guarda el ajuste con el telefono sin el prefijo del pais; aqui se prueban las dos formas.
function clavesTelefono(raw: string, codigoPais: string | null): string[] {
  let d = digitos(raw);
  if (d.startsWith("00")) d = d.slice(2);
  const claves = [d];
  const cod = digitos(codigoPais);
  if (cod && d.startsWith(cod) && d.length > cod.length + 5) claves.push(d.slice(cod.length));
  return claves;
}

function clienteUrl(negocio: any): string {
  if (negocio?.sitio_web) return negocio.sitio_web;
  if (negocio?.slug) return `https://tusalon.github.io/rservasroma/?s=${encodeURIComponent(negocio.slug)}`;
  return "https://tusalon.github.io/rservasroma/";
}

// Mas de esto en una sola pasada y el resto espera a la siguiente (15 min): protege la base.
const MAX_CLIENTAS_POR_SALON = 150;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Variables no configuradas" }, 503);

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;

  let negociosUrl = `${supabaseUrl}/rest/v1/negocios?fidelizacion_activa=eq.true&fidelizacion_descuento_porcentaje=gt.0` +
    `&select=id,nombre,slug,sitio_web,codigo_pais,fidelizacion_activa,fidelizacion_cada_citas,fidelizacion_descuento_porcentaje`;
  if (body?.negocio_id) negociosUrl += `&id=eq.${encodeURIComponent(body.negocio_id)}`;
  const negociosRes = await fetch(negociosUrl, { headers });
  if (!negociosRes.ok) return jsonResponse({ error: "Error consultando salones", detalle: await negociosRes.text() }, 500);
  const negocios: any[] = await negociosRes.json();

  const desde = fechaCuba(-2);
  let revisadas = 0, avisadas = 0, sinSuscripcion = 0;
  const errores: string[] = [];
  const detalle: any[] = [];

  for (const negocio of negocios) {
    try {
      // 1) Quien completo una cita en los ultimos dias: solo esas clientas pueden haber cambiado de estado.
      const recientesRes = await fetch(
        `${supabaseUrl}/rest/v1/reservas?negocio_id=eq.${negocio.id}&estado=eq.Completado&fecha=gte.${desde}` +
        `&cliente_whatsapp=not.is.null&select=cliente_whatsapp,cliente_nombre&limit=2000`,
        { headers },
      );
      if (!recientesRes.ok) { errores.push(`${negocio.nombre}: ${await recientesRes.text()}`); continue; }
      const recientes: any[] = await recientesRes.json();
      if (!recientes.length) continue;

      // Agrupar por telefono normalizado: varias escrituras del mismo numero son UNA clienta.
      const clientas = new Map<string, { crudos: Set<string>; nombre: string }>();
      for (const fila of recientes) {
        const [clave] = clavesTelefono(fila.cliente_whatsapp, negocio.codigo_pais);
        if (!clave) continue;
        const c = clientas.get(clave) || { crudos: new Set<string>(), nombre: "" };
        c.crudos.add(String(fila.cliente_whatsapp));
        if (!c.nombre && fila.cliente_nombre) c.nombre = String(fila.cliente_nombre);
        clientas.set(clave, c);
      }

      // 2) Ajustes manuales de la duena (tabla pequena, una consulta por salon).
      const ajustesRes = await fetch(
        `${supabaseUrl}/rest/v1/fidelizacion_ajustes?negocio_id=eq.${negocio.id}&select=whatsapp,ajuste`, { headers });
      const ajustes: Record<string, number> = {};
      if (ajustesRes.ok) (await ajustesRes.json()).forEach((a: any) => { ajustes[digitos(a.whatsapp)] = parseInt(a.ajuste, 10) || 0; });

      let n = 0;
      for (const [clave, clienta] of clientas) {
        if (++n > MAX_CLIENTAS_POR_SALON) break;
        revisadas++;

        // 3) Todas sus citas completadas (en las escrituras del numero que existen en la base).
        const lista = [...clienta.crudos].map((c) => `"${c.replace(/"/g, "")}"`).join(",");
        const histRes = await fetch(
          `${supabaseUrl}/rest/v1/reservas?negocio_id=eq.${negocio.id}&estado=eq.Completado&cliente_whatsapp=in.(${encodeURIComponent(lista)})` +
          `&select=id,fecha,hora_inicio,hora_fin,duracion,estado,cliente_whatsapp&limit=1000`,
          { headers },
        );
        if (!histRes.ok) { errores.push(`${negocio.nombre}/${clave}: ${await histRes.text()}`); continue; }
        // Se normaliza el telefono para que las filas de una misma clienta se agrupen como en el panel.
        const filas = (await histRes.json()).map((f: any) => ({ ...f, cliente_whatsapp: clave }));
        const citas = agruparCitas(filas);
        const ajuste = clavesTelefono(clave, negocio.codigo_pais).map((k) => ajustes[k]).find((v) => v !== undefined) || 0;
        const tarjeta = estadoTarjeta(negocio, citas, ajuste);
        if (!tarjeta.activa) continue;
        const aviso = textoAviso(tarjeta, negocio.nombre || "tu salón", clienta.nombre);
        if (!aviso) continue;

        // 4) No repetir: ya se aviso con este total de citas?
        const totales = citas.length;
        const yaRes = await fetch(
          `${supabaseUrl}/rest/v1/fidelidad_avisos?negocio_id=eq.${negocio.id}&whatsapp=eq.${clave}&citas_totales=eq.${totales}&select=tipo&limit=1`,
          { headers },
        );
        if (yaRes.ok && (await yaRes.json()).length) continue;

        detalle.push({ salon: negocio.nombre, clienta: clave, citas: totales, tipo: aviso.tipo });
        if (dryRun) continue;

        // 5) Push a todos los dispositivos de la clienta (cualquiera de las escrituras de su numero).
        let enviados = 0;
        for (const crudo of clienta.crudos) {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/enviar-web-push`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              negocio_id: negocio.id,
              cliente_whatsapp: crudo,
              role: "cliente",
              title: aviso.title,
              body: aviso.body,
              url: clienteUrl(negocio),
              tags: `fidelidad-${aviso.tipo}`,
              data: { tipo: "fidelidad", aviso: aviso.tipo, citas: totales },
            }),
          });
          const pushData = await pushRes.json().catch(() => ({}));
          if (pushRes.ok) enviados += Number(pushData?.sent || 0);
          else errores.push(`${negocio.nombre}/${clave}: ${pushData?.error || pushRes.status}`);
        }

        if (enviados > 0) {
          avisadas++;
          await fetch(`${supabaseUrl}/rest/v1/fidelidad_avisos`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
            body: JSON.stringify({ negocio_id: negocio.id, whatsapp: clave, citas_totales: totales, tipo: aviso.tipo }),
          });
        } else {
          sinSuscripcion++; // no tiene notificaciones activadas: se reintenta en la proxima pasada (solo 2 dias)
        }
      }
    } catch (err: any) {
      errores.push(`${negocio.nombre}: ${err?.message || err}`);
    }
  }

  return jsonResponse({
    ok: true, dry_run: dryRun, salones: negocios.length, revisadas, avisadas,
    sin_suscripcion: sinSuscripcion, pendientes_de_avisar: dryRun ? detalle : undefined,
    errores: errores.length ? errores : undefined,
  });
});
