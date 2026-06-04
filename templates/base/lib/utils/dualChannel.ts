/**
 * Run multiple side-effect "channels" in parallel and report each one's outcome
 * without letting any single failure block the others. Mirrors the pattern in
 * autoflowr-site api/onboarding/submit.js.
 *
 * Usage:
 *   const results = await dualChannel({
 *     telegram: () => sendTelegram(...),
 *     airtable: () => airtableCreate(...),
 *     email:    () => sendConfirmation(...),
 *   });
 *   // results: { telegram: { ok: true }, airtable: { ok: false, error: ... }, ... }
 */
export async function dualChannel<T extends Record<string, () => Promise<any>>>(channels: T): Promise<Record<keyof T, ChannelResult>> {
  const keys = Object.keys(channels) as (keyof T)[];
  const settled = await Promise.allSettled(keys.map((k) => channels[k]()));
  const out = {} as Record<keyof T, ChannelResult>;
  keys.forEach((k, i) => {
    const r = settled[i];
    if (r.status === "fulfilled") {
      out[k] = { ok: true, value: r.value };
    } else {
      out[k] = { ok: false, error: r.reason?.message || String(r.reason) };
    }
  });
  return out;
}

export type ChannelResult =
  | { ok: true; value?: any }
  | { ok: false; error: string };

/** True if at least one channel succeeded. */
export function anyOk(results: Record<string, ChannelResult>): boolean {
  return Object.values(results).some((r) => r.ok);
}

/** Compact summary for logs. */
export function summarize(results: Record<string, ChannelResult>): string {
  return Object.entries(results)
    .map(([k, r]) => `${k}:${r.ok ? "✓" : "✗"}`)
    .join(" ");
}
