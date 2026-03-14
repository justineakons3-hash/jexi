/**
 * routes/stream.js
 *
 * GET /api/stream?url=<encoded-cdn-url>
 *
 * Proxies bigcdn.cc MP4 streams through your server so the browser
 * never contacts bigcdn.cc directly. This bypasses hotlink protection
 * because we forward Referer: https://hqporner.com/ on every request.
 *
 * Supports Range requests (seek / partial content) — required for
 * HTML5 <video> to work correctly.
 */

const express = require("express");
const axios   = require("axios");
const router  = express.Router();

const ALLOWED_HOST = /bigcdn\.cc/i;
const TIMEOUT_MS   = 20000;

router.get("/", async (req, res) => {
  const { url } = req.query;

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

  // ── forward Range header if browser sent one (seek support) ───
  const upstreamHeaders = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer":         "https://hqporner.com/",
    "Origin":          "https://hqporner.com",
    "Accept":          "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  if (req.headers.range) {
    upstreamHeaders["Range"] = req.headers.range;
  }

  try {
    const upstream = await axios.get(parsed.href, {
      headers:      upstreamHeaders,
      responseType: "stream",
      timeout:      TIMEOUT_MS,
      maxRedirects: 5,
      decompress:   false, // don't decompress — pass bytes straight through
      validateStatus: (s) => s < 500,
    });

    // ── relay status + relevant headers ───────────────────────
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

    // Always allow range requests
    res.setHeader("accept-ranges", "bytes");

    // Allow the browser to use this response
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
