/**
 * hqSearch.js
 * Live-scrapes HQPorner search results on demand.
 *
 * ROOT CAUSE FIX: HQPorner video URLs are /hdporn/ID-title.html
 * Previous code looked for a[href*='/video/'] — never matched anything.
 * Now correctly looks for a[href*='/hdporn/'].
 */

const axios   = require("axios");
const cheerio = require("cheerio");

const HQ_BASE = "https://hqporner.com";

/* ── Minimal but realistic headers ── */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection":      "keep-alive",
  "Cache-Control":   "no-cache",
};

function slugToId(href) {
  const clean = (href || "").replace(/\/$/, "");
  const parts = clean.split("/").filter(Boolean);
  const slug  = parts[parts.length - 1] || Math.random().toString(36).slice(2);
  return "hq_" + slug;
}

function normalizeViews(raw) {
  if (!raw) return 0;
  const s = String(raw).replace(/,/g, "").trim().toUpperCase();
  if (s.endsWith("M")) return Math.floor(parseFloat(s) * 1_000_000);
  if (s.endsWith("K")) return Math.floor(parseFloat(s) * 1_000);
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toAbsolute(href) {
  if (!href) return "";
  let url = href.startsWith("http") ? href : HQ_BASE + href;

  // Normalize: HQPorner video pages always end in .html
  // Some hrefs on search pages are missing it — add it if absent
  if (url.includes("/hdporn/") && !url.endsWith(".html")) {
    url = url.replace(/\/?$/, ".html");
  }

  return url;
}

function resolveThumb(imgEl) {
  return (
    imgEl.attr("data-src")      ||
    imgEl.attr("data-lazy")     ||
    imgEl.attr("data-original") ||
    imgEl.attr("src")           ||
    ""
  );
}

/* ── fetch with 2 retries ── */
async function fetchHTML(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data } = await axios.get(url, {
        headers:        HEADERS,
        timeout:        20_000,
        maxRedirects:   5,
        decompress:     true,
        // accept everything — don't throw on 404/403 etc.
        validateStatus: () => true,
      });
      if (typeof data === "string") return data;
      return JSON.stringify(data);
    } catch (err) {
      console.warn(`[hqSearch] attempt ${attempt} error: ${err.message}`);
      if (attempt < 3) await sleep(attempt * 1000);
    }
  }
  return null;
}

/**
 * Scrape HQPorner search page.
 * @param {string} query  – raw search term
 * @param {number} page   – 1-based
 * @returns {Promise<Array>}
 */
async function scrapeHQSearch(query, page = 1) {
  // spaces → "+" (HQporner format)
  const qParam    = query.trim().replace(/\s+/g, "+");
  const searchUrl = `${HQ_BASE}/?q=${qParam}` + (page > 1 ? `&page=${page}` : "");

  console.log("[hqSearch] fetching:", searchUrl);

  const html = await fetchHTML(searchUrl);
  if (!html) {
    console.error("[hqSearch] all retries failed, returning []");
    return [];
  }

  // Debug: log a snippet so we can see what HQporner returned
  console.log("[hqSearch] HTML snippet:", html.slice(0, 300).replace(/\n/g, " "));

  const $      = cheerio.load(html);
  const videos = [];
  const seen   = new Set();

  /* ── Strategy 1: find all /hdporn/ links that contain an img ──
   * HQPorner video URLs: /hdporn/12345-video-title.html
   * This is the correct selector — NOT /video/ which never exists on HQporner.
   */
  $("a[href*='/hdporn/']").each((_, el) => {
    const $el  = $(el);
    const href = $el.attr("href") || "";
    if (!href || !href.includes("/hdporn/")) return;

    // skip nav / category links that don't wrap an image
    const img = $el.find("img").first();
    if (!img.length) return;

    const id = slugToId(href);
    if (seen.has(id)) return;
    seen.add(id);

    const pageUrl   = toAbsolute(href);
    const thumbnail = resolveThumb(img);
    if (!thumbnail) return;

    // title: prefer alt text, then any nearby heading/span
    const parent = $el.parent();
    const title  =
      img.attr("alt")                                                               ||
      parent.find(".title, h3, h2, .name, [class*='title']").first().text().trim() ||
      $el.attr("title")                                                             ||
      "HQPorner Video";

    // duration: look in the link or its parent container
    const duration =
      $el.find("[class*='time'], [class*='duration'], .time, .duration")
         .first().text().trim() ||
      parent.find("[class*='time'], [class*='duration']")
         .first().text().trim() ||
      "Unknown";

    // creator: look for pornstar/model links near the card
    const creatorId =
      parent.find(".pornstar a, .model a, [class*='pornstar'] a, [class*='actress'] a")
         .first().text().trim() ||
      "HQPorner";

    videos.push({
      id,
      title:     title.trim(),
      url:       pageUrl,          // the HQPorner page URL — resolved on click
      type:      "hqporner",
      thumbnail,
      duration,
      views:     0,
      creatorId,
    });
  });

  /* ── Strategy 2: broader fallback — any anchor that contains /hdporn ── */
  if (videos.length === 0) {
    console.warn("[hqSearch] Strategy 1 found nothing, trying Strategy 2 (all hrefs)");

    $("a").each((_, el) => {
      const $el  = $(el);
      const href = ($el.attr("href") || "").trim();
      if (!href.includes("hdporn") && !href.match(/\/\d{4,}/)) return;

      const img = $el.find("img").first();
      if (!img.length) return;

      const thumbnail = resolveThumb(img);
      if (!thumbnail) return;

      const id = slugToId(href);
      if (seen.has(id)) return;
      seen.add(id);

      videos.push({
        id,
        title:     img.attr("alt") || $el.text().trim() || "HQPorner Video",
        url:       toAbsolute(href),
        type:      "hqporner",
        thumbnail,
        duration:  "Unknown",
        views:     0,
        creatorId: "HQPorner",
      });
    });
  }

  // Log first 3 URLs so we can verify the format is correct
  if (videos.length > 0) {
    console.log("[hqSearch] sample URLs:", videos.slice(0, 3).map(v => v.url));
  }
  console.log(`[hqSearch] "${query}" page ${page} → ${videos.length} results`);
  return videos;
}

module.exports = { scrapeHQSearch };
