/**
 * videoCache.ts
 *
 * Two caches:
 *
 * 1. VIDEO CARD CACHE — first 50 video cards (metadata + thumbnail)
 *    Stored in localStorage. TTL: 6 hours.
 *    Lets the feed render instantly without waiting for the backend.
 *
 * 2. CDN URL CACHE — resolved HQPorner CDN stream URLs
 *    Stored in localStorage keyed by videoId.
 *    TTL: 2 hours (CDN URLs expire).
 *    Lets HQPorner videos play instantly without the 10-15s resolve wait.
 */

import { Video } from "../types";

/* ── Card cache ── */
const VIDEO_CACHE_KEY = "vx_video_cache_v1";
const VIDEO_CACHE_TS  = "vx_video_cache_ts_v1";
const MAX_CACHED      = 50;
const CARD_TTL_MS     = 6 * 60 * 60 * 1000; // 6 hours

/* ── CDN URL cache ── */
const CDN_CACHE_KEY   = "vx_cdn_cache_v1";   // JSON object { [videoId]: { cdnUrl, qualityMap, ts } }
const CDN_TTL_MS      = 2 * 60 * 60 * 1000;  // 2 hours (CDN URLs expire faster)
const MAX_CDN_ENTRIES = 30;                   // keep last 30 resolved URLs

/* ── Types ── */
export interface CdnCacheEntry {
  cdnUrl:     string;
  qualityMap: Record<string, string>;
  ts:         number; // Date.now() when stored
}

type CdnCache = Record<string, CdnCacheEntry>;

/* ── Storage check ── */
function isStorageAvailable(): boolean {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
}

/* ══════════════════════════════════════════════
   CARD CACHE
══════════════════════════════════════════════ */

/** Save up to 50 video cards to localStorage */
export function saveVideosToCache(videos: Video[]): void {
  if (!isStorageAvailable()) return;
  try {
    const toStore = videos.slice(0, MAX_CACHED);
    localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(toStore));
    localStorage.setItem(VIDEO_CACHE_TS,  new Date().toISOString());
  } catch (err) {
    console.warn("videoCache: could not write cards", err);
  }
}

/** Load cached video cards. Returns [] if missing or stale. */
export function loadVideosFromCache(): Video[] {
  if (!isStorageAvailable()) return [];
  try {
    const ts  = localStorage.getItem(VIDEO_CACHE_TS);
    const raw = localStorage.getItem(VIDEO_CACHE_KEY);
    if (!ts || !raw) return [];

    const age = Date.now() - new Date(ts).getTime();
    if (age > CARD_TTL_MS) { clearVideoCache(); return []; }

    const videos: Video[] = JSON.parse(raw);
    return Array.isArray(videos) ? videos : [];
  } catch {
    return [];
  }
}

/** Returns true if a valid non-stale card cache exists */
export function hasFreshCache(): boolean {
  return loadVideosFromCache().length > 0;
}

/** Clear card cache */
export function clearVideoCache(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(VIDEO_CACHE_KEY);
  localStorage.removeItem(VIDEO_CACHE_TS);
}

/* ══════════════════════════════════════════════
   CDN URL CACHE
══════════════════════════════════════════════ */

function loadCdnCache(): CdnCache {
  try {
    const raw = localStorage.getItem(CDN_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CdnCache;
  } catch {
    return {};
  }
}

function saveCdnCache(cache: CdnCache): void {
  try {
    localStorage.setItem(CDN_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("videoCache: could not write CDN cache", err);
  }
}

/**
 * Save a resolved CDN URL for a video.
 * Old entries are evicted when the cache reaches MAX_CDN_ENTRIES.
 */
export function saveCdnUrl(
  videoId: string,
  cdnUrl: string,
  qualityMap: Record<string, string>
): void {
  if (!isStorageAvailable() || !videoId || !cdnUrl) return;

  const cache = loadCdnCache();
  cache[videoId] = { cdnUrl, qualityMap, ts: Date.now() };

  // Evict oldest entries if over limit
  const entries = Object.entries(cache);
  if (entries.length > MAX_CDN_ENTRIES) {
    entries.sort((a, b) => a[1].ts - b[1].ts); // oldest first
    const evict = entries.slice(0, entries.length - MAX_CDN_ENTRIES);
    evict.forEach(([id]) => delete cache[id]);
  }

  saveCdnCache(cache);
}

/**
 * Get a cached CDN URL for a video.
 * Returns null if not cached or if the entry is stale.
 */
export function getCdnUrl(videoId: string): CdnCacheEntry | null {
  if (!isStorageAvailable() || !videoId) return null;
  try {
    const cache = loadCdnCache();
    const entry = cache[videoId];
    if (!entry) return null;

    const age = Date.now() - entry.ts;
    if (age > CDN_TTL_MS) {
      // Stale — remove and return null
      delete cache[videoId];
      saveCdnCache(cache);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

/** Clear all CDN URL cache entries */
export function clearCdnCache(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(CDN_CACHE_KEY);
}
