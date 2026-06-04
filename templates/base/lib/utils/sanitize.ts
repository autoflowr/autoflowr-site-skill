/** Strip CR/LF/tabs — prevents multi-line injection into WhatsApp / Telegram / email. */
export function sanitizeLine(s: string): string {
  return String(s).replace(/[\r\n\t]+/g, " ").trim();
}

/** HTML-entity escape for use in meta tags / email bodies. */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip script/style/iframe tags + inline event handlers from user-supplied HTML. */
export function sanitizeBodyHtml(html: string): string {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
