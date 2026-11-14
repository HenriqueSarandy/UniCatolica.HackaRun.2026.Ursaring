import crypto from "node:crypto";

export const STAFF_COOKIE = "capibot_staff";
export const STAFF_TTL_SECONDS = 12 * 60 * 60;
const PLACEHOLDER_PASSWORDS = new Set(["troque-me"]);

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest();

/** Sem senha configurada (ou placeholder) o painel recusa qualquer login. */
export function panelPasswordConfigured(): boolean {
  const p = process.env.PANEL_PASSWORD;
  return !!p && !PLACEHOLDER_PASSWORDS.has(p);
}

export function verifyPassword(input: string): boolean {
  if (!panelPasswordConfigured()) return false;
  return crypto.timingSafeEqual(sha256(input), sha256(process.env.PANEL_PASSWORD as string));
}

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && !PLACEHOLDER_PASSWORDS.has(s) ? s : null;
}

const hmac = (payload: string, key: string) =>
  crypto.createHmac("sha256", key).update(payload).digest("base64url");

/** Token = `<expiraEmMs>.<hmac>`. */
export function signToken(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload = String(now + STAFF_TTL_SECONDS * 1000);
  return `${payload}.${hmac(payload, key)}`;
}

export function verifyToken(token: string | undefined | null, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !/^\d+$/.test(payload)) return false;
  const expected = Buffer.from(hmac(payload, key));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return false;
  return Number(payload) > now;
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** true se a requisição traz cookie de equipe válido. */
export function isStaff(req: Request): boolean {
  return verifyToken(readCookie(req.headers.get("cookie"), STAFF_COOKIE));
}

/** Retorna uma Response 401 se não autenticado; null se autorizado. */
export function requireStaff(req: Request): Response | null {
  if (isStaff(req)) return null;
  return Response.json({ error: "nao_autorizado" }, { status: 401 });
}
