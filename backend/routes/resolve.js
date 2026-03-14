/**
 * routes/resolve.js
 *
 * POST /api/videos/resolve
 * Body: { pageUrl: "https://hqporner.com/hdporn/123-title.html", videoId?: string }
 *
 * Chain:
 *   Step 1. Fetch HQPorner page → extract mydaddy.cc embed token
 *   Step 2. Fetch mydaddy.cc embed page → extract bigcdn.cc MP4 URLs
 *   Step 3. Wrap each CDN URL in /api/stream?url=<encoded> so the browser
 *           never contacts bigcdn.cc directly (bypasses hotlink protection)
 *   Step 4. Return bestUrl + qualityMap (all proxied)
 */

const express = require("express");
const axios   = require("axios");
const Video   = require("../models/Videos");

const router = express.Router();

const TIMEOUT_MS   = 15000;
const QUALITY_PREF = ["2160", "4k", "1440", "1080", "720", "480", "360"];

// ── axios instances ───────────────────────────────────────────────────────────

const hqHttp = axios.create({
  timeout: TIMEOUT_MS,
  headers: {
    "User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language":           "en-US,en;q=0.9",
    "Accept-Encoding":           "gzip, deflate, br",
    "Connection":                "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest":            "document",
    "Sec-Fetch-Mode":            "navigate",
    "Sec-Fetch-Site":            "none",
    "Sec-Fetch-User":            "?1",
    "Cache-Control":             "max-age=0",
  },
  maxRedirects: 5,
  decompress: true,
});

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
  decompress: true,
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

/**
 * Wrap a raw CDN URL in the /api/stream proxy endpoint.
 * BACKEND_URL must be set in your Render environment variables,
 * e.g. https://your-app.onrender.com
 * Falls back to a relative path for same-origin deployments.
 */
function toProxyUrl(cdnUrl) {
  const base = process.env.BACKEND_URL
    ? process.env.BACKEND_URL.replace(/\/$/, "")
    : "";
  return `${base}/api/stream?url=${encodeURIComponent(cdnUrl)}`;
}

// ── step 1: get mydaddy token from HQPorner page HTML ────────────────────────

async function getEmbedToken(pageUrl) {
  let html;
  try {
    const res = await hqHttp.get(pageUrl);
    html = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (e) {
    throw new Error(`HQPorner fetch failed: ${e.message}`);
  }

  const match = html.match(/mydaddy\.cc\/video\/([a-f0-9]+)\//i);
  if (match) {
    return { token: match[1], embedUrl: `https://mydaddy.cc/video/${match[1]}/` };
  }

  const tokenMatch = html.match(/["'\/]([a-f0-9]{16,20})["'\/]/);
  if (tokenMatch) {
    return { token: tokenMatch[1], embedUrl: `https://mydaddy.cc/video/${tokenMatch[1]}/` };
  }

  throw new Error("Could not find mydaddy embed token — Cloudflare may be blocking the request");
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

  const cdnPattern  = /(?:https?:)?\/\/[a-z0-9]*\.?bigcdn\.cc\/pubs\/[^\s"'\\]+\.mp4/gi;
  const rawMatches  = html.match(cdnPattern) || [];

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

  const qualityMap = buildQualityMap(cdnUrls);
  const bestRaw    = pickBestQuality(cdnUrls);

  // Proxy every URL through /api/stream so Referer is always hqporner.com
  const proxiedBest = toProxyUrl(bestRaw);
  const proxiedMap  = {};
  for (const [q, u] of Object.entries(qualityMap)) {
    proxiedMap[q] = toProxyUrl(u);
  }

  return { bestUrl: proxiedBest, qualityMap: proxiedMap };
}

// ── route handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { pageUrl, videoId } = req.body;

  if (!pageUrl) {
    return res.status(400).json({ error: "pageUrl is required" });
  }

  try {
    // Cache check — but only use cache if it's already a proxy URL
    if (videoId) {
      const cached = await Video.findOne({ id: videoId }).lean();
      if (cached?.cdnUrl && cached.cdnUrl.includes("/api/stream")) {
        console.log(`[resolve] cache hit: ${videoId}`);
        return res.json({ cdnUrl: cached.cdnUrl, qualityMap: cached.cdnQualities || {}, cached: true });
      }
    }

    const { bestUrl, qualityMap } = await resolve(pageUrl);
    console.log(`[resolve] ✓ ${bestUrl}`);
    console.log(`[resolve] qualities: ${Object.keys(qualityMap).join(", ")}`);

    // Cache the proxied result
    if (videoId) {
      await Video.updateOne(
        { id: videoId },
        { $set: { cdnUrl: bestUrl, cdnQualities: qualityMap } }
      ).catch(() => {});
    }

    return res.json({ cdnUrl: bestUrl, qualityMap, cached: false });

  } catch (err) {
    console.error("[resolve] error:", err.message);
    return res.status(500).json({
      error: err.message,
      fallbackUrl: pageUrl,
    });
  }
});

module.exports = router;
