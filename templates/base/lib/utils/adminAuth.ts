import { timingSafeEqual } from "node:crypto";

/**
 * Verify admin credentials on a request. Returns { ok: true } on success or
 * { ok: false, status, reason } on failure. Mirrors the pattern in
 * autoflowr-site api/_lib/admin-auth.js.
 *
 * Requires env:
 *   ADMIN_TOKEN  — shared secret in the Authorization: Bearer <token> header
 *   ADMIN_IPS    — (optional) comma-separated allow-list of IPs
 */
export function verifyAdmin(req: Request): { ok: true } | { ok: false; status: number; reason: string } {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return { ok: false, status: 500, reason: "ADMIN_TOKEN not configured" };
  }

  const hdr = req.headers.get("authorization") || "";
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, status: 401, reason: "missing bearer token" };

  const given = Buffer.from(m[1].trim());
  const want = Buffer.from(expected.trim());
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { ok: false, status: 403, reason: "bad token" };
  }

  const allowedIps = (process.env.ADMIN_IPS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowedIps.length > 0) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    if (!ip || !allowedIps.includes(ip)) {
      return { ok: false, status: 403, reason: "ip-not-allowed" };
    }
  }

  return { ok: true };
}
