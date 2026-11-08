// lista-espera — ofrece las horas liberadas a las clientas en lista de espera (sql-lista-espera-dia.sql).
//
// La llama la base al cancelarse/borrarse/moverse una reserva (trigger reservas_lista_espera_libera, con
// {negocio_id}) y un cron cada 5 minutos (sin cuerpo). En cada pasada:
//   1) Ofertas vencidas (30 min sin reservar): la clienta vuelve a 'esperando' y el hueco se reabre sin ella.
//   2) Dias pasados: esperas 'caducada', huecos 'cerrado'.
//   3) Huecos abiertos: si siguen libres y llegan a la antelacion minima, se le ofrecen a la primera de la
//      fila que encaje (dia, franja, profesional, duracion, que la profesional haga su servicio). Se le guarda
//      30 minutos y se avisa por push a ella y a la duena. Sin candidata, el hueco se cierra.
// Prueba sin cambiar nada: POST {"dry_run": true}.

import { aHora, aMin, diaDe, elegirCandidata, encajaServicios, finLibre, itemsDeEspera, juntarHuecos } from "./cuenta.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GUARDA_MIN = 30;

// Reloj de pared de Cuba como si fuera UTC: sirve para comparar "fecha + hora" de la base con "ahora".
function ahoraCubaPared(): Date {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
}
const pared = (fecha: string, hora: string) => new Date(`${fecha}T${String(hora).slice(0, 5)}:00Z`);
const hora12 = (h: string) => { const m = aMin(h); const hh = Math.floor(m / 60); return `${hh % 12 || 12}:${String(m % 60).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`; };
const diaTexto = (fecha: string) => new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function clienteUrl(n: any): string {
  if (n?.sitio_web) return n.sitio_web;
  return n?.slug ? `https://tusalon.github.io/rservasroma/?s=${encodeURIComponent(n.slug)}` : "https://tusalon.github.io/rservasroma/";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "Variables no configuradas" }, 503);
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const rest = (path: string, init: RequestInit = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const leer = async (path: string) => { const r = await rest(path); if (!r.ok) throw new Error(`${path}: ${await r.text()}`); return r.json(); };
  const cambiar = (path: string, body: unknown) => rest(path, { method: "PATCH", body: JSON.stringify(body), headers: { Prefer: "return=minimal" } });

  const body = await req.json().catch(() => ({}));
  const dry = body?.dry_run === true;
  const filtroNegocio = body?.negocio_id ? `&negocio_id=eq.${encodeURIComponent(body.negocio_id)}` : "";
  const ahora = ahoraCubaPared();
  const hoy = ahora.toISOString().slice(0, 10);
  const informe: any = { vencidas: 0, caducadas: 0, ofrecidas: [], cerrados: 0, errores: [] as string[] };

  try {
    // 1) Ofertas vencidas -> la clienta vuelve a esperar y el hueco se reabre sin ella.
    const vencidas: any[] = await leer(`lista_espera?estado=eq.ofrecida&oferta_hasta=lt.${encodeURIComponent(new Date().toISOString())}&select=id${filtroNegocio}`);
    for (const v of vencidas) {
      informe.vencidas++;
      if (dry) continue;
      await cambiar(`lista_espera?id=eq.${v.id}&estado=eq.ofrecida`, {
        estado: "esperando", oferta_hora: null, oferta_hora_fin: null, oferta_profesional_id: null,
        oferta_profesional_nombre: null, oferta_hasta: null, updated_at: new Date().toISOString(),
      });
      const huecos: any[] = await leer(`lista_espera_huecos?ofrecido_a=eq.${v.id}&select=id,rechazado_por`);
      for (const h of huecos) {
        await cambiar(`lista_espera_huecos?id=eq.${h.id}`, { estado: "abierto", ofrecido_a: null, rechazado_por: [...(h.rechazado_por || []), v.id] });
      }
    }

    // 2) Dias pasados.
    if (!dry) {
      const r = await rest(`lista_espera?estado=in.(esperando,ofrecida,notificada,avisada)&fecha=lt.${hoy}${filtroNegocio}`, {
        method: "PATCH", body: JSON.stringify({ estado: "caducada", updated_at: new Date().toISOString() }), headers: { Prefer: "return=representation" },
      });
      if (r.ok) informe.caducadas = (await r.json()).length;
      await cambiar(`lista_espera_huecos?estado=neq.cerrado&fecha=lt.${hoy}${filtroNegocio}`, { estado: "cerrado" });
    }

    // 3) Huecos abiertos, por salon.
    const abiertos: any[] = await leer(`lista_espera_huecos?estado=eq.abierto&fecha=gte.${hoy}&order=fecha.asc,hora_inicio.asc&select=*${filtroNegocio}`);
    const porNegocio = new Map<string, any[]>();
    abiertos.forEach((h) => porNegocio.set(h.negocio_id, [...(porNegocio.get(h.negocio_id) || []), h]));

    for (const [negocioId, lista] of porNegocio) {
      try {
        const [negocio] = await leer(`negocios?id=eq.${negocioId}&select=id,nombre,slug,sitio_web,ntfy_topic`);
        const [config] = await leer(`configuracion?negocio_id=eq.${negocioId}&select=min_antelacion_horas`);
        const minHoras = Number(config?.min_antelacion_horas ?? 2);
        const profesionales: any[] = await leer(`profesionales?negocio_id=eq.${negocioId}&select=id,nombre`);
        const nombrePro = (id: number) => profesionales.find((p) => p.id === id)?.nombre || "";
        const servicios: any[] = await leer(`servicios?negocio_id=eq.${negocioId}&select=id,nombre,horarios_permitidos,horarios_permitidos_por_dia`);
        const asignaciones: any[] = await leer(`servicios_profesionales?negocio_id=eq.${negocioId}&select=servicio_id,profesional_id`);
        // Huecos seguidos de la misma profesional se juntan (un combo cancelado deja varias filas).
        const juntos = juntarHuecos(lista);

        for (const hueco of juntos) {
          const cerrar = async () => { informe.cerrados++; if (!dry) await cambiar(`lista_espera_huecos?id=in.(${hueco.ids.join(",")})`, { estado: "cerrado" }); };
          const inicio = pared(hueco.fecha, aHora(hueco.ini));
          if (inicio.getTime() < ahora.getTime() + minHoras * 3600000) { await cerrar(); continue; }

          // ¿Sigue libre? Se recorta por la primera reserva activa que lo pise; si pisa el inicio, se cierra.
          const reservas: any[] = await leer(`reservas?negocio_id=eq.${negocioId}&fecha=eq.${hueco.fecha}&profesional_id=eq.${hueco.profesional_id}&estado=not.in.(Cancelado,Completado,Ausente)&select=hora_inicio,hora_fin`);
          const retenidas: any[] = await leer(`lista_espera?negocio_id=eq.${negocioId}&fecha=eq.${hueco.fecha}&estado=eq.ofrecida&oferta_profesional_id=eq.${hueco.profesional_id}&select=oferta_hora,oferta_hora_fin`);
          const fin = finLibre(hueco, [...reservas.map((r) => [r.hora_inicio, r.hora_fin]), ...retenidas.map((r) => [r.oferta_hora, r.oferta_hora_fin])]);
          if (fin === null) { await cerrar(); continue; }

          const esperan: any[] = await leer(`lista_espera?negocio_id=eq.${negocioId}&fecha=eq.${hueco.fecha}&tipo=eq.dia&estado=eq.esperando&order=created_at.asc&select=*`);
          const dia = diaDe(hueco.fecha);
          const elegida = elegirCandidata(hueco, fin, esperan, (e: any, ini: number) => encajaServicios(e, hueco.profesional_id, ini, dia, servicios, asignaciones));
          if (!elegida) { await cerrar(); continue; }

          const duracion = itemsDeEspera(elegida).reduce((t: number, x: any) => t + (Number(x.duracion) || 30), 0) || Number(elegida.duracion) || 30;
          const guardaMs = Math.min(GUARDA_MIN * 60000, inicio.getTime() - ahora.getTime());
          const hasta = new Date(Date.now() + guardaMs).toISOString();
          const pro = nombrePro(hueco.profesional_id);
          const horaTxt = hora12(aHora(hueco.ini));
          informe.ofrecidas.push({ salon: negocio?.nombre, clienta: elegida.cliente_nombre, fecha: hueco.fecha, hora: aHora(hueco.ini), profesional: pro });
          if (dry) continue;

          const r = await rest(`lista_espera?id=eq.${elegida.id}&estado=eq.esperando`, {
            method: "PATCH", headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              estado: "ofrecida", oferta_hora: aHora(hueco.ini), oferta_hora_fin: aHora(hueco.ini + duracion),
              oferta_profesional_id: hueco.profesional_id, oferta_profesional_nombre: pro, oferta_hasta: hasta,
              updated_at: new Date().toISOString(),
            }),
          });
          if (!r.ok || !(await r.json()).length) continue; // se salio o reservo mientras tanto
          await cambiar(`lista_espera_huecos?id=in.(${hueco.ids.join(",")})`, { estado: "ofrecido", ofrecido_a: elegida.id });

          const minutos = Math.max(1, Math.round(guardaMs / 60000));
          const tituloClienta = `🎉 Se liberó una hora para ti — ${negocio?.nombre || "tu salón"}`;
          const textoClienta = `${elegida.servicio} el ${diaTexto(hueco.fecha)} a las ${horaTxt}${pro ? ` con ${pro}` : ""}. Te la guardamos ${minutos} minutos: entra y resérvala.`;
          await fetch(`${url}/functions/v1/enviar-web-push`, {
            method: "POST", headers: H,
            body: JSON.stringify({ negocio_id: negocioId, cliente_whatsapp: elegida.cliente_whatsapp, role: "cliente",
              title: tituloClienta, body: textoClienta, url: clienteUrl(negocio), tags: "lista-espera", data: { tipo: "lista-espera", id: elegida.id } }),
          }).catch(() => {});

          const textoDuena = `Se liberó ${diaTexto(hueco.fecha)} a las ${horaTxt}${pro ? ` con ${pro}` : ""} y se le ofreció a ${elegida.cliente_nombre}, que estaba en lista de espera. Se la guardamos ${minutos} minutos.`;
          await fetch(`${url}/functions/v1/enviar-web-push`, {
            method: "POST", headers: H,
            body: JSON.stringify({ negocio_id: negocioId, role: "admin", title: "Lista de espera: hora ofrecida", body: textoDuena, tags: "lista-espera" }),
          }).catch(() => {});
          if (negocio?.ntfy_topic) {
            await fetch(`https://ntfy.sh/${negocio.ntfy_topic}`, {
              method: "POST", body: textoDuena, headers: { Title: "Lista de espera: hora ofrecida", Tags: "bell" },
            }).catch(() => {});
          }
        }
      } catch (e: any) {
        informe.errores.push(`${negocioId}: ${e?.message || e}`);
      }
    }
  } catch (e: any) {
    informe.errores.push(String(e?.message || e));
  }

  return json({ ok: true, dry_run: dry, ...informe, errores: informe.errores.length ? informe.errores : undefined });
});
