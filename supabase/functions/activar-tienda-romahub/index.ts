// Activa o sincroniza el acceso de un negocio de RservasRoma en RomaHub.
// La contraseña actual se verifica contra negocios.password_hash y se usa
// directamente en Supabase Auth. Nunca se guarda ni se devuelve en texto.

import { compare } from "npm:bcryptjs@3.0.3";
import {
  corsHeaders,
  enforceRateLimits,
  generateRecoveryCode,
  hashRecoveryCode,
  isOriginAllowed,
  json,
  normalizeWhatsApp,
} from "../_shared/romahub-security.ts";

const AUTH_PHONE_DOMAIN = "whatsapp.rservasroma.local";

type ServiceHeaders = Record<string, string>;

async function getFirst(url: string, headers: ServiceHeaders): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}.`);
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : null;
}

async function guardarCredenciales(
  supabaseUrl: string,
  headers: ServiceHeaders,
  negocioId: string,
  userId: string,
  whatsapp: string,
  recoveryHash: string,
  existe: boolean,
): Promise<boolean> {
  const payload = {
    negocio_id: negocioId,
    user_id: userId,
    usuario: whatsapp,
    whatsapp,
    password_recuperacion: null,
    codigo_recuperacion_hash: recoveryHash,
    codigo_actualizado_at: new Date().toISOString(),
    intentos_fallidos: 0,
    bloqueado_hasta: null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(
    existe
      ? `${supabaseUrl}/rest/v1/tiendas_credenciales?negocio_id=eq.${encodeURIComponent(negocioId)}`
      : `${supabaseUrl}/rest/v1/tiendas_credenciales`,
    {
      method: existe ? "PATCH" : "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    },
  );
  return response.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Método no permitido." }, 405);
  if (!isOriginAllowed(req)) return json(req, { error: "Origen no permitido." }, 403);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json(req, { error: "Servidor sin configurar." }, 500);

  const serviceHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Datos inválidos." }, 400);
  }

  if (String(body.website || "").trim()) {
    return json(req, { error: "No se pudo validar el formulario." }, 400);
  }

  const negocioId = String(body.negocio_id || "").trim();
  const password = String(body.password || "");
  if (!negocioId) return json(req, { error: "Falta el negocio." }, 400);
  if (password.length < 6 || password.length > 72) {
    return json(req, { error: "La contraseña de RservasRoma debe tener entre 6 y 72 caracteres." }, 400);
  }

  let negocio: Record<string, unknown> | null;
  try {
    negocio = await getFirst(
      `${SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}&select=id,nombre,telefono,password_hash&limit=1`,
      serviceHeaders,
    );
  } catch (error) {
    console.error("No se pudo consultar el negocio:", error);
    return json(req, { error: "No se pudo validar el negocio." }, 503);
  }
  if (!negocio) return json(req, { error: "Negocio no encontrado." }, 404);

  let whatsapp: string;
  try {
    whatsapp = normalizeWhatsApp(String(negocio.telefono || ""));
  } catch (error) {
    return json(req, { error: (error as Error).message }, 400);
  }

  try {
    const allowed = await enforceRateLimits(
      req,
      SUPABASE_URL,
      SERVICE_KEY,
      "sincronizar_romahub",
      whatsapp,
      { ipLimit: 10, phoneLimit: 5, windowSeconds: 3600 },
    );
    if (!allowed) return json(req, { error: "Demasiados intentos. Espera una hora antes de probar otra vez." }, 429);
  } catch (error) {
    console.error("Rate limit sincronización RomaHub:", error);
    return json(req, { error: "La sincronización está temporalmente protegida. Intenta más tarde." }, 503);
  }

  const passwordHash = String(negocio.password_hash || "");
  if (!passwordHash) return json(req, { error: "Este negocio no tiene una contraseña de RservasRoma configurada." }, 409);

  let passwordValida = false;
  try {
    passwordValida = await compare(password, passwordHash);
  } catch (error) {
    console.error("No se pudo verificar bcrypt:", error);
  }
  if (!passwordValida) {
    return json(req, { error: "La contraseña de RservasRoma es incorrecta." }, 401);
  }

  const authEmail = `53${whatsapp}@${AUTH_PHONE_DOMAIN}`;
  let vinculo: Record<string, unknown> | null = null;
  let credenciales: Record<string, unknown> | null = null;
  try {
    [vinculo, credenciales] = await Promise.all([
      getFirst(
        `${SUPABASE_URL}/rest/v1/usuarios_negocio?negocio_id=eq.${encodeURIComponent(negocioId)}&select=id,user_id&limit=1`,
        serviceHeaders,
      ),
      getFirst(
        `${SUPABASE_URL}/rest/v1/tiendas_credenciales?negocio_id=eq.${encodeURIComponent(negocioId)}&select=negocio_id,user_id&limit=1`,
        serviceHeaders,
      ),
    ]);
  } catch (error) {
    console.error("No se pudo consultar el acceso RomaHub:", error);
    return json(req, { error: "No se pudo consultar el acceso de RomaHub." }, 503);
  }

  const yaActivada = Boolean(vinculo);
  let userId = String(vinculo?.user_id || credenciales?.user_id || "");
  let vinculoCreadoId = "";

  if (yaActivada) {
    if (!userId) {
      return json(req, { error: "El acceso anterior necesita reparación manual. Contacta al soporte de RomaHub." }, 409);
    }

    const updateAuth = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: serviceHeaders,
      body: JSON.stringify({ password }),
    });
    if (!updateAuth.ok) {
      console.error("No se pudo sincronizar Auth:", await updateAuth.text());
      return json(req, { error: "No se pudo sincronizar la contraseña con RomaHub." }, 500);
    }
  } else {
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ email: authEmail, password, email_confirm: true }),
    });
    const authData = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok) {
      const message = String(authData?.msg || authData?.error_description || authData?.error || "");
      if (/already|registered|exists/i.test(message)) {
        return json(req, { error: "Ese WhatsApp ya tiene un acceso de RomaHub. Contacta al soporte para vincularlo." }, 409);
      }
      return json(req, { error: "No se pudo activar la tienda en RomaHub." }, 500);
    }

    userId = String(authData?.id || authData?.user?.id || "");
    if (!userId) return json(req, { error: "No se pudo crear el acceso de RomaHub." }, 500);

    const linkResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios_negocio`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, negocio_id: negocioId, rol: "dueno", activo: true }),
    });
    const linkRows = await linkResponse.json().catch(() => []);
    if (!linkResponse.ok) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: serviceHeaders,
      }).catch(() => {});
      return json(req, { error: "No se pudo vincular el negocio con RomaHub." }, 500);
    }
    vinculoCreadoId = String(Array.isArray(linkRows) ? linkRows[0]?.id || "" : "");
  }

  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashRecoveryCode(recoveryCode, SERVICE_KEY);
  const credentialsSaved = await guardarCredenciales(
    SUPABASE_URL,
    serviceHeaders,
    negocioId,
    userId,
    whatsapp,
    recoveryHash,
    Boolean(credenciales),
  );

  if (!credentialsSaved) {
    if (!yaActivada) {
      if (vinculoCreadoId) {
        await fetch(`${SUPABASE_URL}/rest/v1/usuarios_negocio?id=eq.${encodeURIComponent(vinculoCreadoId)}`, {
          method: "DELETE",
          headers: serviceHeaders,
        }).catch(() => {});
      }
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: serviceHeaders,
      }).catch(() => {});
    }
    return json(req, {
      error: yaActivada
        ? "La contraseña se sincronizó, pero no se pudo renovar el código. Contacta a RomaHub."
        : "No se pudo guardar la recuperación segura de la tienda.",
    }, 500);
  }

  return json(req, {
    ok: true,
    yaActivada,
    acceso: {
      usuario: whatsapp,
      codigo_recuperacion: recoveryCode,
      usa_password_rservas: true,
    },
  });
});
