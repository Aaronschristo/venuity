/**
 * Escapes HTML special characters to prevent XSS.
 * Mirrors the old frontend's escapeHTML function.
 */
export function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(str).replace(/[&<>'"]/g, (tag) => map[tag] || tag);
}
