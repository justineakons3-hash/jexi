/**
 * thumbnailProxy.ts
 *
 * Rewrites HQPorner thumbnail URLs so they go through our backend proxy,
 * which adds the required Referer header to avoid 403 errors from the CDN.
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

const HQPORNER_CDN_HOSTS = [
  "fastporndelivery.hqporner.com",
  "cdn.hqporner.com",
  "img.hqporner.com",
  "hqporner.com",
];

/**
 * Normalise any URL to a full absolute https:// URL.
 * Handles:
 *   "//fastporndelivery..."  → "https://fastporndelivery..."
 *   "https://..."            → unchanged
 *   ""                       → ""
 */
function normalizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

function isHQPornerCDN(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return HQPORNER_CDN_HOSTS.some(
      (h) => hostname === h || hostname.endsWith("." + h)
    );
  } catch {
    return false;
  }
}

/**
 * Returns a proxied URL for HQPorner thumbnails, passthrough for everything else.
 * Always normalizes protocol-relative URLs first.
 */
export function proxyThumbnail(thumbnail: string, type?: string): string {
  if (!thumbnail) return thumbnail;

  // Normalize // → https:// first so new URL() and encodeURIComponent work correctly
  const normalized = normalizeUrl(thumbnail);

  if (type === "hqporner" || isHQPornerCDN(normalized)) {
    return `${API_BASE}/proxy/image?url=${encodeURIComponent(normalized)}`;
  }

  return normalized;
}
