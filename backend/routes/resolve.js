/**
 * routes/resolve.js
 *
 * POST /api/videos/resolve
 * Body: { pageUrl: "https://hqporner.com/hdporn/123-title.html", videoId?: string }
 *
 * Chain:
 *   Step 1. Fetch HQPorner page → extract mydaddy.cc embed token
 *   Step 2. Fetch mydaddy.cc embed page → extract bigcdn.cc MP4 URLs
 *   Step 3. Wrap each CDN URL in /api/stream?url=<encoded>&ref=<encoded-page-url>
 *   Step 4. Return bestUrl + qualityMap (all proxied)
 *
 * On 404: marks the video deleted:true in MongoDB so the feed
 * stops serving it to users on future page loads.
 */

const express = require("express");
const axios   = require("axios");
const Video   = require("../models/Videos");

const router = express.Router();

const TIMEOUT_MS   = 15000;
const QUALITY_PREF = ["2160", "4k", "1440", "1080", "720", "480", "360"];

// ── axios instances ───────────────────────────────────────────────────────────

// Rotate User-Agents so Cloudflare can't fingerprint repeated server requests
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// cloudscraper handles Cloudflare's JS challenge + TLS fingerprint detection.
// axios has a detectable Node.js JA3 fingerprint that CF blocks intermittently.
// cloudscraper mimics a real browser's TLS handshake so CF lets it through.
const cloudscraper = require("cloudscraper");

const embedHttp = axios.create({
  timeout: TIMEOUT_MS,
  headers: {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://hqporner.com/",
    "Origin":          "https://hqporner.com",
  },
  maxRedirects: 5,
  decompress:   true,
});

// ── helpers ───────────────────────────────────────────────────────────────────

function rankUrl(u) {
  for (let i = 0; i < QUALITY_PREF.length; i++) {
    if (u.includes(`/${QUALITY_PREF[i]}.`) || u.includes(`_${QUALITY_PREF[i]}.`)) return i;
  }
  return QUALITY_PREF.length;
}

function pickBestQuality(urls) {
  if (!urls.length) return null;
  return [...urls].sort((a, b) => rankUrl(a) - rankUrl(b))[0];
}

function buildQualityMap(urls) {
  const withSub    = urls.filter(u => /s\d+\.bigcdn\.cc/.test(u));
  const candidates = withSub.length ? withSub : urls;
  const map = {};
  for (const u of candidates) {
    for (const q of QUALITY_PREF) {
      if ((u.includes(`/${q}.`) || u.includes(`_${q}.`)) && !map[q]) {
        map[q] = u;
        break;
      }
    }
  }
  return map;
}

function ensureHttps(url) {
  if (url.startsWith("//")) return "https:" + url;
  if (!url.startsWith("http")) return "https://" + url;
  return url;
}

function toProxyUrl(cdnUrl, pageUrl) {
  const base = process.env.BACKEND_URL
    ? process.env.BACKEND_URL.replace(/\/$/, "")
    : "";
  return (
    `${base}/api/stream` +
    `?url=${encodeURIComponent(cdnUrl)}` +
    `&ref=${encodeURIComponent(pageUrl)}`
  );
}

// ── mark a video deleted in MongoDB ──────────────────────────────────────────

async function markDeleted(videoId, pageUrl) {
  try {
    // Try by videoId first, fall back to URL match for search-scraped videos
    if (videoId) {
      await Video.updateOne({ id: videoId }, { $set: { deleted: true } });
      console.log(`[resolve] marked deleted by id: ${videoId}`);
    } else {
      await Video.updateOne({ url: pageUrl }, { $set: { deleted: true } });
      console.log(`[resolve] marked deleted by url: ${pageUrl}`);
    }
  } catch (err) {
    // Non-critical — don't let a DB error block the response
    console.warn(`[resolve] could not mark deleted: ${err.message}`);
  }
}

// ── step 1: get mydaddy token from HQPorner page HTML ────────────────────────
// Uses cloudscraper instead of axios — cloudscraper executes CF's JS challenge
// and uses a real browser TLS fingerprint, so Cloudflare doesn't block it.

async function getEmbedToken(pageUrl) {
  const urlVariants = [pageUrl];
  if (pageUrl.includes("/hdporn/")) {
    if (!pageUrl.endsWith(".html")) {
      urlVariants.push(pageUrl.replace(/\/$/, "") + ".html");
    } else {
      urlVariants.push(pageUrl.replace(/\.html$/, ""));
    }
  }

  let lastErr = null;

  for (const url of urlVariants) {
    console.log(`[resolve] cloudscraper fetching: ${url}`);
    try {
      const html = await new Promise((resolve, reject) => {
        cloudscraper.get({
          uri:     url,
          timeout: TIMEOUT_MS,
          headers: {
            "Accept-Language": "en-US,en;q=0.9",
            "Referer":         "https://hqporner.com/",
          },
        }, (err, response, body) => {
          if (err) return reject(err);
          if (response.statusCode === 404) {
            return reject(Object.assign(new Error("404"), { status: 404 }));
          }
          if (response.statusCode !== 200) {
            return reject(new Error(`Status ${response.statusCode}`));
          }
          resolve(body);
        });
      });

      // Got HTML — extract token
      const match = html.match(/mydaddy\.cc\/video\/([a-f0-9]+)\//i);
      if (match) {
        return { token: match[1], embedUrl: `https://mydaddy.cc/video/${match[1]}/` };
      }

      const tokenMatch = html.match(/["'\\/]([a-f0-9]{16,20})["'\\/]/);
      if (tokenMatch) {
        return { token: tokenMatch[1], embedUrl: `https://mydaddy.cc/video/${tokenMatch[1]}/` };
      }

      throw new Error("Embed token not found in page HTML");

    } catch (err) {
      console.warn(`[resolve] ${url} → ${err.message}`);
      lastErr = err;
      // 404 on all variants = truly gone
      if (err.status === 404 && url === urlVariants[urlVariants.length - 1]) {
        const e = new Error("This video has been removed from HQPorner.");
        e.code  = "DELETED";
        throw e;
      }
      // Otherwise try next variant
    }
  }

  throw lastErr || new Error("Could not fetch HQPorner page");
}

// ── step 2: get CDN URLs from mydaddy embed page ─────────────────────────────

async function getCdnUrlsFromEmbed(embedUrl, pageUrl) {
  let html;
  try {
    const res = await embedHttp.get(embedUrl, {
      headers: { Referer: pageUrl },
    });
    html = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (e) {
    throw new Error(`mydaddy.cc fetch failed: ${e.message}`);
  }

  const cdnPattern = /(?:https?:)?\/\/[a-z0-9]*\.?bigcdn\.cc\/pubs\/[^\s"'\\]+\.mp4/gi;
  const rawMatches = html.match(cdnPattern) || [];

  const barePattern = /bigcdn\.cc\/pubs\/[^\s"'\\]+\.mp4/gi;
  const bareMatches = (html.match(barePattern) || []).map(u => "https://" + u);

  const all = [...new Set([
    ...rawMatches.map(ensureHttps),
    ...bareMatches,
  ])].filter(u => u.includes(".mp4"));

  return all;
}

// ── main resolver ─────────────────────────────────────────────────────────────

async function resolve(pageUrl) {
  const { token, embedUrl } = await getEmbedToken(pageUrl);
  console.log(`[resolve] token: ${token} → ${embedUrl}`);

  const cdnUrls = await getCdnUrlsFromEmbed(embedUrl, pageUrl);
  console.log(`[resolve] found ${cdnUrls.length} CDN URLs:`, cdnUrls);

  if (!cdnUrls.length) {
    throw new Error("No CDN URLs found — player structure may have changed");
  }

  const qualityMap  = buildQualityMap(cdnUrls);
  const bestRaw     = pickBestQuality(cdnUrls);
  const proxiedBest = toProxyUrl(bestRaw, pageUrl);
  const proxiedMap  = {};
  for (const [q, u] of Object.entries(qualityMap)) {
    proxiedMap[q] = toProxyUrl(u, pageUrl);
  }

  return { bestUrl: proxiedBest, qualityMap: proxiedMap };
}

// ── route handler ─────────────────────────────────────────────────────────────
//
// Accepts either:
//   { pageUrl, videoId }              — server fetches HQporner page (may hit CF)
//   { pageUrl, videoId, embedToken }  — browser already extracted the token,
//                                       server skips the HQporner fetch entirely
//
// The embedToken path is preferred — the browser is a real browser so
// Cloudflare never blocks it. The server only talks to mydaddy.cc + bigcdn.cc.

router.post("/", async (req, res) => {
  const { pageUrl, videoId } = req.body;

  if (!pageUrl) {
    return res.status(400).json({ error: "pageUrl is required" });
  }

  console.log("[resolve] pageUrl received:", pageUrl);
  try {
    // Cache check
    if (videoId) {
      const cached = await Video.findOne({ id: videoId }).lean();
      if (cached?.cdnUrl && cached.cdnUrl.includes("/api/stream") && cached.cdnUrl.includes("&ref=")) {
        console.log(`[resolve] cache hit: ${videoId}`);
        return res.json({ cdnUrl: cached.cdnUrl, qualityMap: cached.cdnQualities || {}, cached: true });
      }
    }

    const { bestUrl, qualityMap } = await resolve(pageUrl);

    console.log(`[resolve] ✓ ${bestUrl}`);
    console.log(`[resolve] qualities: ${Object.keys(qualityMap).join(", ")}`);

    // Cache the working result
    if (videoId) {
      await Video.updateOne(
        { id: videoId },
        { $set: { cdnUrl: bestUrl, cdnQualities: qualityMap, deleted: false } }
      ).catch(() => {});
    }

    return res.json({ cdnUrl: bestUrl, qualityMap, cached: false });

  } catch (err) {
    console.error("[resolve] error:", err.message);

    if (err.code === "DELETED") {
      await markDeleted(videoId, pageUrl);
      return res.status(200).json({
        error:       err.message,
        deleted:     true,
        fallbackUrl: pageUrl,
      });
    }

    return res.status(200).json({
      error:       err.message,
      fallbackUrl: pageUrl,
    });
  }
});

module.exports = router;
