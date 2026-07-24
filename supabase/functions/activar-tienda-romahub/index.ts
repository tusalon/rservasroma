// Edge Function: activar-tienda-romahub
// Boton "Vende en RomaHub" dentro del panel admin de un negocio rservasroma
// YA EXISTENTE. A diferencia de crear-tienda-externa (que crea un negocio
// nuevo), esta funcion NO crea negocio: activa el acceso al panel de tienda
// de RomaHub (Supabase Auth + usuarios_negocio) para un negocio_id que ya
// existe, usando el WhatsApp que el negocio ya tiene guardado.
//
// Corre con SERVICE ROLE (omite RLS) para poder crear el usuario de Auth y
// el vinculo. Es idempotente: si el negocio ya esta activado, devuelve las
// credenciales guardadas en vez de fallar.
//
// Nota de seguridad: como esta funcion se llama desde admin.html, que hoy
// autentica al dueno con slug+password (bcrypt) y NO con un JWT de Supabase,
// no hay forma de verificar aqui con un token quien esta detras del negocio_id
// recibido. Esto es consistente con el resto del panel admin actual: todas
// sus escrituras a Supabase ya confian en el negocio_id guardado en
// localStorage tras un login valido, sobre una RLS abierta (pendiente de
// seguridad #1, documentado aparte). No se introduce un hueco nuevo; se
// hereda el existente.

const AUTH_PHONE_DOMAIN = "whatsapp.rservasroma.local";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizarWhatsApp(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("53") && digits.length === 10 ? digits.slice(2) : digits;
  if (!/^\d{8}$/.test(local)) throw new Error("El teléfono guardado de tu negocio no es válido. Corrígelo en Editar negocio e intenta de nuevo.");
  return local;
}

function generarPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Servidor sin configurar." }, 500);

  const svc = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }

  const negocioId = String(body.negocio_id || "").trim();
  if (!negocioId) return json({ error: "Falta el negocio." }, 400);

  // ── 1) Buscar el negocio y su teléfono ──
  const negRes = await fetch(
    `${SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}&select=id,nombre,telefono,slug,es_tienda_externa`,
    { headers: svc },
  );
  const negocios = await negRes.json().catch(() => []);
  const negocio = Array.isArray(negocios) ? negocios[0] : null;
  if (!negocio) return json({ error: "Negocio no encontrado." }, 404);

  let whatsapp: string;
  try {
    whatsapp = normalizarWhatsApp(negocio.telefono);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const authEmail = `53${whatsapp}@${AUTH_PHONE_DOMAIN}`;

  // ── 2) ¿Ya estaba activado? Devolver las credenciales guardadas. ──
  const vinculoExistente = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios_negocio?negocio_id=eq.${encodeURIComponent(negocioId)}&select=id&limit=1`,
    { headers: svc },
  );
  const vinculos = await vinculoExistente.json().catch(() => []);
  if (Array.isArray(vinculos) && vinculos.length > 0) {
    const credRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tiendas_credenciales?negocio_id=eq.${encodeURIComponent(negocioId)}&select=usuario,password_recuperacion&limit=1`,
      { headers: svc },
    );
    const creds = await credRes.json().catch(() => []);
    const cred = Array.isArray(creds) ? creds[0] : null;
    if (cred) {
      return json({ ok: true, yaActivada: true, acceso: { usuario: cred.usuario, password: cred.password_recuperacion } });
    }
    return json({ error: "Tu tienda ya está activada, pero no se pudo recuperar tu contraseña. Escríbenos por soporte." }, 409);
  }

  // ── 3) Crear usuario en Supabase Auth ──
  const password = generarPassword();
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: svc,
    body: JSON.stringify({ email: authEmail, password, email_confirm: true }),
  });
  const authData = await authRes.json().catch(() => ({}));
  if (!authRes.ok) {
    const msg = String(authData?.msg || authData?.error_description || authData?.error || "");
    if (/already|registered|exists/i.test(msg)) {
      return json({ error: "Ese WhatsApp ya tiene una cuenta de tienda. Si es tuya, entra desde login.html en RomaHub." }, 409);
    }
    return json({ error: "No se pudo activar tu tienda. Intenta de nuevo." }, 500);
  }
  const userId = authData?.id || authData?.user?.id;
  if (!userId) return json({ error: "No se pudo activar tu tienda." }, 500);

  const rollbackAuth = async () => {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: svc }).catch(() => {});
  };

  // ── 4) Vincular usuario ↔ negocio (negocio YA existente, no se crea) ──
  const vinculoRes = await fetch(`${SUPABASE_URL}/rest/v1/usuarios_negocio`, {
    method: "POST",
    headers: svc,
    body: JSON.stringify({ user_id: userId, negocio_id: negocioId, rol: "dueno" }),
  });
  if (!vinculoRes.ok) {
    await rollbackAuth();
    return json({ error: "No se pudo activar tu tienda. Intenta de nuevo." }, 500);
  }

  // ── 5) Guardar credenciales recuperables ──
  await fetch(`${SUPABASE_URL}/rest/v1/tiendas_credenciales`, {
    method: "POST",
    headers: svc,
    body: JSON.stringify({ negocio_id: negocioId, usuario: whatsapp, password_recuperacion: password, whatsapp }),
  }).catch(() => {});

  return json({ ok: true, yaActivada: false, acceso: { usuario: whatsapp, password } });
});
