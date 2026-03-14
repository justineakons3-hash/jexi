/**
 * routes/stream.js
 *
 * GET /api/stream?url=<encoded-cdn-url>&ref=<encoded-hqporner-page-url>
 *
 * Proxies bigcdn.cc MP4 streams through the server so the browser
 * never contacts bigcdn.cc directly.
 *
 * KEY FIX: bigcdn.cc hotlink protection checks the exact HQPorner video
 * page URL as the Referer (e.g. https://hqporner.com/hdporn/123-title.html),
 * NOT just the homepage. The `ref` query param carries this exact URL so
 * every request uses the correct Referer — this is why half the videos
 * were failing before (they were getting Referer: https://hqporner.com/).
 *
 * Supports Range requests (seek / partial content) — required for
 * HTML5 <video> to work correctly.
 */

const express = require("express");
const axios   = require("axios");
const router  = express.Router();

const ALLOWED_HOST = /bigcdn\.cc/i;
const TIMEOUT_MS   = 20000;

// Fallback referer if no `ref` param supplied (e.g. old cached URLs)
const DEFAULT_REFERER = "https://hqporner.com/";

router.get("/", async (req, res) => {
  const { url, ref } = req.query;

  // ── validation ────────────────────────────────────────────────
  if (!url) {
    return res.status(400).json({ error: "url query param required" });
  }

  let parsed;
  try {
    parsed = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOST.test(parsed.hostname)) {
    return res.status(403).json({ error: "Only bigcdn.cc URLs are allowed" });
  }

  // ── decode the page referer ───────────────────────────────────
  // Use the exact HQPorner video page URL supplied by resolve.js.
  // This is what bigcdn.cc checks for hotlink protection.
  let referer = DEFAULT_REFERER;
  if (ref) {
    try {
      const decoded = decodeURIComponent(ref);
      // Only accept hqporner.com URLs as referer (safety check)
      if (decoded.includes("hqporner.com")) {
        referer = decoded;
      }
    } catch {
      // malformed ref — fall back to default
    }
  }

  // ── build upstream headers ────────────────────────────────────
  const upstreamHeaders = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer":         referer,   // ← exact video page URL, not just homepage
    "Origin":          "https://hqporner.com",
    "Accept":          "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest":  "video",
    "Sec-Fetch-Mode":  "no-cors",
    "Sec-Fetch-Site":  "cross-site",
  };

  if (req.headers.range) {
    upstreamHeaders["Range"] = req.headers.range;
  }

  try {
    const upstream = await axios.get(parsed.href, {
      headers:        upstreamHeaders,
      responseType:   "stream",
      timeout:        TIMEOUT_MS,
      maxRedirects:   5,
      decompress:     false,
      validateStatus: (s) => s < 500,
    });

    // Log if CDN rejected the request so we can diagnose
    if (upstream.status === 403 || upstream.status === 401) {
      console.warn(`[stream] CDN rejected with ${upstream.status} for ref: ${referer}`);
    }

    // ── relay status + relevant headers ──────────────────────
    const relay = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
    ];

    res.status(upstream.status);
    for (const h of relay) {
      if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
    }

    res.setHeader("accept-ranges",               "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");

    upstream.data.pipe(res);
    req.on("close", () => upstream.data.destroy());

  } catch (err) {
    console.error("[stream] proxy error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Upstream fetch failed", detail: err.message });
    }
  }
});

module.exports = router;
