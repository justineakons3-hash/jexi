/**
 * imageProxy.js
 * 
 * Proxies thumbnail images from HQPorner CDN, adding the required
 * Referer header so the CDN doesn't return 403.
 * 
 * Usage: GET /api/proxy/image?url=https://fastporndelivery.hqporner.com/...
 */

const express = require("express");
const axios   = require("axios");

const router = express.Router();

/* Allow-list of CDN hostnames we're willing to proxy */
const ALLOWED_HOSTS = [
  "fastporndelivery.hqporner.com",
  "cdn.hqporner.com",
  "img.hqporner.com",
  "hqporner.com",
];

router.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  try {
    const upstream = await axios.get(url, {
      responseType: "stream",
      timeout: 15_000,
      headers: {
        // This is the key fix — CDN checks Referer and blocks requests without it
        "Referer":          "https://hqporner.com/",
        "User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":           "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language":  "en-US,en;q=0.9",
      },
    });

    // Forward content-type and cache headers
    const ct = upstream.headers["content-type"];
    if (ct) res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 24h in browser
    res.setHeader("Access-Control-Allow-Origin", "*");

    upstream.data.pipe(res);
  } catch (err) {
    console.error("Image proxy error:", err.message);
    res.status(502).json({ error: "Failed to fetch image" });
  }
});

module.exports = router;
