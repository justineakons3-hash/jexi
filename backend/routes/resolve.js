/**
 * routes/resolve.js
 *
 * POST /api/videos/resolve
 * Body: { pageUrl: "https://hqporner.com/hdporn/123-title.html", videoId?: string }
 *
 * Chain:
 *   Step 1. cloudscraper fetches HQPorner page (bypasses Cloudflare JA3 check)
 *           → extracts mydaddy.cc embed token
 *   Step 2. Fetch mydaddy.cc embed page → extract bigcdn.cc MP4 URLs
 *   Step 3. Return raw CDN URLs directly to frontend
 *           (stream.js now does a 302 redirect so no proxying needed)
 */

const express      = require("express");
const axios        = require("axios");
const cloudscraper = require("cloudscraper");
const Video        = require("../models/Videos");

const router = express.Router();

const TIMEOUT_MS   = 20000;
const QUALITY_PREF = ["2160", "4k", "1440", "1080", "720", "480", "360"];

// ── embed page fetcher (mydaddy.cc — not CF protected) ───────────────────────

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

// ── step 1: cloudscraper fetches HQPorner page ────────────────────────────────
// cloudscraper executes Cloudflare's JS challenge and uses a real browser
// TLS fingerprint (JA3) — CF can't distinguish it from a real browser.

function buildUrlVariants(pageUrl) {
  const variants = [pageUrl];
  if (pageUrl.includes("/hdporn/")) {
    if (!pageUrl.endsWith(".html")) {
      variants.push(pageUrl.replace(/\/$/, "") + ".html");
    } else {
      variants.push(pageUrl.replace(/\.html$/, ""));
    }
  }
  return [...new Set(variants)];
}

async function getEmbedToken(pageUrl) {
  const urlVariants = buildUrlVariants(pageUrl);
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
            const e = new Error("404");
            e.status = 404;
            return reject(e);
          }
          if (response.statusCode !== 200) {
            return reject(new Error(`Status ${response.statusCode}`));
          }
          resolve(body);
        });
      });

      // Extract mydaddy.cc token from page HTML
      const match = html.match(/mydaddy\.cc\/video\/([a-f0-9]+)\//i);
      if (match) {
        return { token: match[1], embedUrl: `https://mydaddy.cc/video/${match[1]}/` };
      }

      const tokenMatch = html.match(/["'\/]([a-f0-9]{16,20})["'\/]/);
      if (tokenMatch) {
        return { token: tokenMatch[1], embedUrl: `https://mydaddy.cc/video/${tokenMatch[1]}/` };
      }

      throw new Error("Embed token not found in page HTML");

    } catch (err) {
      console.warn(`[resolve] ${url} → ${err.message}`);
      lastErr = err;
      if (err.status === 404 && url === urlVariants[urlVariants.length - 1]) {
        const e = new Error("This video has been removed from HQPorner.");
        e.code  = "DELETED";
        throw e;
      }
    }
  }

  throw lastErr || new Error("Could not fetch HQPorner page");
}

// ── step 2: CDN URLs from mydaddy embed page ──────────────────────────────────

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

  // Return raw CDN URLs — stream.js does a 302 redirect so no proxy wrapping needed.
  // Browser downloads directly from bigcdn.cc at full speed, no Render bottleneck.
  const qualityMap = buildQualityMap(cdnUrls);
  const bestUrl    = pickBestQuality(cdnUrls);

  return { bestUrl, qualityMap };
}

// ── route handler ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { pageUrl, videoId } = req.body;

  if (!pageUrl) {
    return res.status(400).json({ error: "pageUrl is required" });
  }

  console.log("[resolve] pageUrl received:", pageUrl);

  try {
    // Cache check — invalidate old proxy-wrapped URLs (they contain /api/stream)
    // so they get re-resolved to direct CDN URLs
    if (videoId) {
      const cached = await Video.findOne({ id: videoId }).lean();
      if (
        cached?.cdnUrl &&
        !cached.cdnUrl.includes("/api/stream") && // must be a direct CDN URL
        cached.cdnUrl.includes("bigcdn.cc")
      ) {
        console.log(`[resolve] cache hit: ${videoId}`);
        return res.json({
          cdnUrl:     cached.cdnUrl,
          qualityMap: cached.cdnQualities || {},
          cached:     true,
        });
      }
    }

    const { bestUrl, qualityMap } = await resolve(pageUrl);
    console.log(`[resolve] ✓ ${bestUrl}`);
    console.log(`[resolve] qualities: ${Object.keys(qualityMap).join(", ")}`);

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
      // Mark in DB so feed stops showing it
      try {
        if (videoId) {
          await Video.updateOne({ id: videoId }, { $set: { deleted: true } });
        } else {
          await Video.updateOne({ url: pageUrl }, { $set: { deleted: true } });
        }
        console.log(`[resolve] marked deleted: ${videoId || pageUrl}`);
      } catch (_) {}

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
