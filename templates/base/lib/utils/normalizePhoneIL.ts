/**
 * Israeli phone normalizer.
 *
 * Accepts: "054-520-9956" | "+972 54-520-9956" | "0545209956" | "972-54-520-9956"
 * Returns: "+972545209956"  (E.164)
 *
 * Returns the original string if it doesn't look Israeli (lets caller validate).
 */
export function normalizePhoneIL(input: string): string {
  if (!input) return "";
  const digits = String(input).replace(/[^\d]/g, "");
  if (!digits) return "";

  if (digits.startsWith("972")) {
    return "+" + digits;
  }
  if (digits.startsWith("0")) {
    return "+972" + digits.slice(1);
  }
  if (digits.length === 9) {
    return "+972" + digits;
  }
  return input.trim();
}

/** Digits-only Israeli format used by Green API / Telegram. */
export function toDigitsOnly(input: string): string {
  return normalizePhoneIL(input).replace(/[^\d]/g, "");
}

/** True if the normalized form is a valid Israeli mobile number. */
export function isValidIL(input: string): boolean {
  const n = normalizePhoneIL(input);
  return /^\+9725\d{8}$/.test(n);
}
