/**
 * routes/stream.js
 *
 * GET /api/stream?url=<encoded-cdn-url>&ref=<encoded-hqporner-page-url>
 *
 * RENDER FIX: Instead of proxying all video bytes through Render (which
 * bottlenecks on free-tier bandwidth), this route now does a 302 redirect
 * to the CDN URL directly. The browser downloads from bigcdn.cc at full
 * speed with no Render in the middle.
 *
 * bigcdn.cc does NOT enforce Referer on direct MP4 Range requests from
 * browsers — only on embed page loads. The referrerpolicy="no-referrer"
 * attribute on the <video> tag suppresses the browser's Referer header
 * so bigcdn.cc sees no Referer at all (same as a direct link).
 *
 * Range requests / seeking work natively because the browser talks to
 * bigcdn.cc directly instead of going through a proxy.
 */

const express = require("express");
const router  = express.Router();

const ALLOWED_HOST = /bigcdn\.cc/i;

router.get("/", (req, res) => {
  const { url } = req.query;

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

  // Redirect browser directly to CDN — no proxying, no Render bottleneck
  return res.redirect(302, parsed.href);
});

module.exports = router;
