// Borra de Cloudinary la foto de un diseno que ya se elimino del catalogo.
//
// Por que una funcion y no una llamada directa desde el panel: destruir un
// recurso en Cloudinary exige firmar la peticion con el API secret, y ese
// secret no puede viajar al navegador. Aqui vive como variable de entorno.
//
// Regla de seguridad propia: solo borra si NINGUNA fila de catalogo_disenos
// sigue apuntando a esa imagen. Asi una llamada equivocada (o malintencionada)
// nunca puede dejar sin foto a un diseno publicado. El orden correcto es
// borrar primero la fila y despues llamar aqui.
//
// Desplegar:  npx supabase functions deploy borrar-imagen-catalogo
// Secretos:   npx supabase secrets set CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...

import { corsHeaders, isOriginAllowed, json } from "../_shared/romahub-security.ts";

const CLOUD_NAME = "uyvla7fj";
// Solo se tocan las carpetas del proyecto: aunque llegue otra URL de la misma
// cuenta de Cloudinary, no se borra.
const CARPETAS_PERMITIDAS = ["rservasroma/catalogo"];

// De la URL de Cloudinary al public_id que pide la API de borrado.
// https://res.cloudinary.com/<cloud>/image/upload/v123/rservasroma/catalogo/x.jpg
//   -> rservasroma/catalogo/x
export function publicIdDesdeUrl(url: string): string | null {
  const texto = String(url || "");
  const marca = "/upload/";
  const corte = texto.indexOf(marca);
  if (corte === -1) return null;

  let resto = texto.slice(corte + marca.length);
  // Quitar transformaciones (w_400,q_auto...) y la version (v1712345678).
  const partes = resto.split("/").filter((parte) => {
    if (/^v\d+$/.test(parte)) return false;
    return !/^[a-z]{1,3}_[^/]+$/.test(parte);
  });
  resto = partes.join("/");

  const sinExtension = resto.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  return sinExtension || null;
}

async function firmar(publicId: string, timestamp: number, secret: string): Promise<string> {
  const cadena = `public_id=${publicId}&timestamp=${timestamp}${secret}`;
  const datos = new TextEncoder().encode(cadena);
  const hash = await crypto.subtle.digest("SHA-1", datos);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (!isOriginAllowed(req)) return json(req, { error: "Origen no permitido." }, 403);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const API_KEY = Deno.env.get("CLOUDINARY_API_KEY") || "";
  const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") || "";

  if (!API_KEY || !API_SECRET) {
    return json(req, { error: "Faltan las credenciales de Cloudinary." }, 500);
  }

  const cuerpo = await req.json().catch(() => ({}));
  const imagenUrl = String(cuerpo?.imagen_url || "");
  const publicId = publicIdDesdeUrl(imagenUrl);

  if (!publicId) return json(req, { error: "URL de imagen no valida." }, 400);
  if (!CARPETAS_PERMITIDAS.some((carpeta) => publicId.startsWith(carpeta))) {
    return json(req, { error: "Esa imagen no pertenece al catalogo." }, 403);
  }

  // Nadie mas debe estar usandola. Si sigue referenciada, no se toca.
  const enUso = await fetch(
    `${SUPABASE_URL}/rest/v1/catalogo_disenos?imagen_url=eq.${encodeURIComponent(imagenUrl)}&select=id&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  ).then((r) => r.json()).catch(() => []);

  if (Array.isArray(enUso) && enUso.length > 0) {
    return json(req, { error: "La imagen sigue en uso por un diseno." }, 409);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const firma = await firmar(publicId, timestamp, API_SECRET);

  const formulario = new FormData();
  formulario.append("public_id", publicId);
  formulario.append("timestamp", String(timestamp));
  formulario.append("api_key", API_KEY);
  formulario.append("signature", firma);

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: "POST", body: formulario },
  );

  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    return json(req, { error: "Cloudinary rechazo el borrado.", detalle: resultado }, 502);
  }

  // Cloudinary responde "not found" si ya no existia: para nosotros es exito,
  // el objetivo (que no ocupe cuota) ya se cumplio.
  return json(req, { ok: true, public_id: publicId, resultado: resultado?.result || "ok" });
});
