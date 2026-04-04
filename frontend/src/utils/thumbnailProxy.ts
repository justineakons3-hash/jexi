/**
 * thumbnailProxy.ts
 *
 * Rewrites HQPorner thumbnail URLs so they go through our backend proxy,
 * which adds the required Referer header to avoid 403 errors from the CDN.
 *
 * Usage:
 *   import { proxyThumbnail } from "../utils/thumbnailProxy";
 *   <img src={proxyThumbnail(video.thumbnail, video.type)} />
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

const HQPORNER_CDN_HOSTS = [
  "fastporndelivery.hqporner.com",
  "cdn.hqporner.com",
  "img.hqporner.com",
  "hqporner.com",
];

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
 */
export function proxyThumbnail(thumbnail: string, type?: string): string {
  if (!thumbnail) return thumbnail;

  // Only proxy if it's an HQPorner CDN URL (by type hint OR by hostname)
  if (type === "hqporner" || isHQPornerCDN(thumbnail)) {
    return `${API_BASE}/proxy/image?url=${encodeURIComponent(thumbnail)}`;
  }

  return thumbnail;
}
