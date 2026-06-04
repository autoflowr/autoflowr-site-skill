const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "{{siteHost}}").split(",").map((s) => s.trim()).filter(Boolean);

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkOrigin(req: Request): { ok: boolean } {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return { ok: true };
  try {
    const host = new URL(origin).host;
    if (ALLOWED_ORIGINS.some((a) => host === a || host.endsWith("." + a))) return { ok: true };
  } catch {
    return { ok: false };
  }
  return { ok: false };
}

export function rateLimit(key: string, bucket: string, max: number, windowMs: number): boolean {
  const k = `${bucket}:${key}`;
  const now = Date.now();
  const entry = buckets.get(k);
  if (!entry || entry.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /[\d+\-() ]{7,}/;

export function validateLeadInput(body: any): string[] {
  const errs: string[] = [];
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const email = String(body?.email || "").trim();
  if (!name) errs.push("name");
  if (!phone || !PHONE_RE.test(phone)) errs.push("phone");
  if (email && !EMAIL_RE.test(email)) errs.push("email");
  return errs;
}
