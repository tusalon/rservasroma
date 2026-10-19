// panel-login — sesion verificada en el SERVIDOR para el panel (dueña o profesional).
//
// POR QUE EXISTE
// El panel escribe con la clave publica (anon): el servidor nunca supo quien es la dueña, asi que no hay
// forma de cerrar con RLS los datos sensibles (ver el plan de RLS). Esta funcion comprueba la contrasena
// de verdad (bcrypt contra negocios.password_hash, o login_profesional para una profesional) y devuelve un
// JWT de 12 horas firmado con el secreto del proyecto. Con ese JWT, PostgREST y Storage ejecutan como el
// rol panel_salon y las politicas de la base ven el negocio y el nivel de quien pregunta.
//
// Hoy lo usan las fichas de clientas (sql-fichas-clientas.sql). El mismo token servira para cerrar
// despues las demas tablas.
//
// SECRETO: PANEL_JWT_SECRET = el "JWT Secret" del proyecto (Project Settings > API). Sin el, esta funcion
// responde 503 y no firma nada.
//   npx supabase secrets set PANEL_JWT_SECRET=... --project-ref zorhclhvykikaachfrmp
//
// Pide: { slug, password, telefono? }  (telefono solo para profesionales)
// Responde: { token, expira_en, rol, nivel, profesional_id? }

import { compare } from "npm:bcryptjs@3.0.3";
import { SignJWT } from "npm:jose@5.9.6";
import {
  corsHeaders,
  enforceRateLimits,
  isOriginAllowed,
  json,
} from "../_shared/romahub-security.ts";

const DURACION_HORAS = 12;
const ERROR_GENERICO = "Usuario o contraseña incorrectos.";

async function primero(url: string, headers: Record<string, string>): Promise<Record<string, unknown> | null> {
  const respuesta = await fetch(url, { headers });
  if (!respuesta.ok) throw new Error(`Supabase respondió ${respuesta.status}.`);
  const filas = await respuesta.json().catch(() => []);
  return Array.isArray(filas) ? (filas[0] || null) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Método no permitido." }, 405);
  if (!isOriginAllowed(req)) return json(req, { error: "Origen no permitido." }, 403);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const JWT_SECRET = Deno.env.get("PANEL_JWT_SECRET") || "";
  if (!SUPABASE_URL || !SERVICE_KEY || !JWT_SECRET) return json(req, { error: "Servidor sin configurar." }, 503);

  const cuerpo = await req.json().catch(() => ({}));
  const slug = String(cuerpo?.slug || "").trim().toLowerCase();
  const password = String(cuerpo?.password || "");
  const telefono = String(cuerpo?.telefono || "").replace(/\D/g, "");
  if (!slug || !password || slug.length > 80 || password.length > 200) {
    return json(req, { error: ERROR_GENERICO }, 401);
  }

  try {
    // Limite de intentos por IP y por salon (mismo mecanismo que activar-tienda-romahub).
    const permitido = await enforceRateLimits(req, SUPABASE_URL, SERVICE_KEY, "panel_login", slug, {
      ipLimit: 40,
      phoneLimit: 10,
      windowSeconds: 900,
    });
    if (!permitido) return json(req, { error: "Demasiados intentos. Espera unos minutos." }, 429);

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    const negocio = await primero(
      `${SUPABASE_URL}/rest/v1/negocios?slug=eq.${encodeURIComponent(slug)}&select=id,password_hash&limit=1`,
      headers,
    );
    if (!negocio) return json(req, { error: ERROR_GENERICO }, 401);
    const negocioId = String(negocio.id);

    let rol: "duena" | "profesional" = "duena";
    let nivel = 3;
    let profesionalId: number | null = null;

    if (telefono) {
      // Profesional: la misma funcion SQL que usa el panel al entrar (acepta los formatos de contraseña actuales).
      const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/login_profesional`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ p_negocio_id: negocioId, p_telefono: telefono, p_password: password }),
      });
      if (!respuesta.ok) throw new Error(`login_profesional respondió ${respuesta.status}.`);
      const filas = await respuesta.json().catch(() => []);
      const profesional = Array.isArray(filas) ? filas[0] : null;
      if (!profesional) return json(req, { error: ERROR_GENERICO }, 401);
      rol = "profesional";
      nivel = Number(profesional.nivel) || 1;
      profesionalId = Number(profesional.id) || null;
    } else {
      const hash = String(negocio.password_hash || "");
      let valida = false;
      try {
        valida = hash.length > 0 && await compare(password, hash);
      } catch (error) {
        console.error("No se pudo verificar bcrypt:", error);
      }
      if (!valida) return json(req, { error: ERROR_GENERICO }, 401);
    }

    const ahora = Math.floor(Date.now() / 1000);
    const expira = ahora + DURACION_HORAS * 3600;
    const claims: Record<string, unknown> = { role: "panel_salon", negocio_id: negocioId, rol, nivel };
    if (profesionalId) claims.profesional_id = profesionalId;
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(negocioId)
      .setIssuedAt(ahora)
      .setExpirationTime(expira)
      .sign(new TextEncoder().encode(JWT_SECRET));

    return json(req, { token, expira_en: expira, rol, nivel, profesional_id: profesionalId });
  } catch (error) {
    console.error("panel-login:", error);
    return json(req, { error: "No se pudo iniciar la sesión. Inténtalo de nuevo." }, 500);
  }
});
