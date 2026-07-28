const DEFAULT_ALLOWED_ORIGINS = [
  "https://tusalon.github.io",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function configuredOrigins(): string[] {
  const extra = String(Deno.env.get("ROMAHUB_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return configuredOrigins().includes(origin);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && configuredOrigins().includes(origin)
    ? origin
    : "https://tusalon.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function normalizeWhatsApp(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("53") && digits.length === 10 ? digits.slice(2) : digits;
  if (!/^\d{8}$/.test(local)) throw new Error("El WhatsApp guardado debe tener 8 dígitos.");
  return local;
}

export function normalizeRecoveryCode(value: string): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  return raw.match(/.{1,4}/g)?.join("-") || raw;
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashRecoveryCode(code: string, serviceKey: string): Promise<string> {
  const secret = Deno.env.get("RECOVERY_CODE_SECRET") || serviceKey.slice(-32);
  return sha256(`${secret}:${normalizeRecoveryCode(code)}`);
}

function clientIp(req: Request): string {
  return String(
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown",
  ).trim();
}

async function consumeLimit(
  supabaseUrl: string,
  serviceKey: string,
  key: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const secret = Deno.env.get("RATE_LIMIT_SECRET") || serviceKey.slice(-32);
  const keyHash = await sha256(`${secret}:${key}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consumir_limite_romahub`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_clave_hash: keyHash,
      p_accion: action,
      p_limite: limit,
      p_ventana_segundos: windowSeconds,
    }),
  });
  if (!response.ok) throw new Error("No se pudo validar el límite de seguridad.");
  return (await response.json()) === true;
}

export async function enforceRateLimits(
  req: Request,
  supabaseUrl: string,
  serviceKey: string,
  action: string,
  whatsapp: string,
  settings: { ipLimit: number; phoneLimit: number; windowSeconds: number },
): Promise<boolean> {
  const [ipAllowed, phoneAllowed] = await Promise.all([
    consumeLimit(supabaseUrl, serviceKey, `ip:${clientIp(req)}`, action, settings.ipLimit, settings.windowSeconds),
    consumeLimit(supabaseUrl, serviceKey, `phone:${whatsapp}`, action, settings.phoneLimit, settings.windowSeconds),
  ]);
  return ipAllowed && phoneAllowed;
}
