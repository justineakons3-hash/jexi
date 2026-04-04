/**
 * videoCache.ts
 *
 * Caches the first 50 video cards (metadata + thumbnail + url) in localStorage
 * so the app renders instantly on subsequent loads, avoiding Render cold-boot delay.
 *
 * Keys:
 *   VIDEO_CACHE_KEY  — JSON array of up to 50 Video objects
 *   VIDEO_CACHE_TS   — ISO timestamp of when the cache was written
 *
 * Cache is considered stale after CACHE_TTL_MS (default: 6 hours).
 */

import { Video } from "../types";

const VIDEO_CACHE_KEY = "vx_video_cache_v1";
const VIDEO_CACHE_TS  = "vx_video_cache_ts_v1";
const MAX_CACHED      = 50;
const CACHE_TTL_MS    = 6 * 60 * 60 * 1000; // 6 hours

function isStorageAvailable(): boolean {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
}

/** Save up to 50 videos to localStorage */
export function saveVideosToCache(videos: Video[]): void {
  if (!isStorageAvailable()) return;
  try {
    const toStore = videos.slice(0, MAX_CACHED);
    localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(toStore));
    localStorage.setItem(VIDEO_CACHE_TS,  new Date().toISOString());
  } catch (err) {
    // Quota exceeded or private mode — fail silently
    console.warn("videoCache: could not write to localStorage", err);
  }
}

/** Load cached videos. Returns [] if cache is missing or stale. */
export function loadVideosFromCache(): Video[] {
  if (!isStorageAvailable()) return [];
  try {
    const ts  = localStorage.getItem(VIDEO_CACHE_TS);
    const raw = localStorage.getItem(VIDEO_CACHE_KEY);

    if (!ts || !raw) return [];

    const age = Date.now() - new Date(ts).getTime();
    if (age > CACHE_TTL_MS) {
      // Stale — clear and return empty
      clearVideoCache();
      return [];
    }

    const videos: Video[] = JSON.parse(raw);
    return Array.isArray(videos) ? videos : [];
  } catch {
    return [];
  }
}

/** Returns true if a valid (non-stale) cache exists */
export function hasFreshCache(): boolean {
  return loadVideosFromCache().length > 0;
}

/** Clear cache (called after a fresh fetch succeeds) */
export function clearVideoCache(): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(VIDEO_CACHE_KEY);
  localStorage.removeItem(VIDEO_CACHE_TS);
}
