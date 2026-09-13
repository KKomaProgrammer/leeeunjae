// Cloudflare uses same-origin APIs. The GitHub build supplies the existing backend URL.
const backend = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  return `${backend}${path}`;
}
