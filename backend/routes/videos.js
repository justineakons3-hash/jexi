const express = require("express");
const axios   = require("axios");
const Video   = require("../models/Videos");
const auth    = require("../middleware/auth");
const { scrapeHQSearch } = require("../scraper/hqSearch");

const router = express.Router();

/* ── interleave two arrays evenly ── */
function interleave(a, b) {
  const result = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

/* ────────────────────────────────────────────────────────
   GET /videos/top10
──────────────────────────────────────────────────────── */
router.get("/top10", async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ views: -1 }).limit(10).lean();
    return res.json({ videos });
  } catch (err) {
    console.error("Top10 route error:", err);
    return res.json({ videos: [] });
  }
});

/* ────────────────────────────────────────────────────────
   GET /videos  (Feed + Search)
──────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    // source filter works in BOTH search mode and feed mode
    const source = req.query.source; // "eporner" | "hqporner" | undefined = "all"

    console.log("Incoming Query:", req.query);

    /* ──────────────── SEARCH MODE ────────────────
     * source filter is now respected:
     *   source=eporner  → only eporner API results
     *   source=hqporner → only HQPorner scraped results
     *   source=all/unset → both, interleaved
     */
    if (search && search.trim() !== "") {
      const wantEporner  = !source || source === "all" || source === "eporner";
      const wantHQPorner = !source || source === "all" || source === "hqporner";

      // Half limit each when showing both; full limit when showing one source
      const eLimit = (wantEporner && wantHQPorner) ? Math.ceil(limit / 2) : limit;
      const hLimit = (wantEporner && wantHQPorner) ? Math.ceil(limit / 2) : limit;

      const epornerUrl =
        `https://www.eporner.com/api/v2/video/search/` +
        `?query=${encodeURIComponent(search)}` +
        `&per_page=${eLimit}` +
        `&page=${page}` +
        `&thumbsize=big` +
        `&order=latest` +
        `&format=json`;

      // Run both in parallel; failed source returns empty array
      const [epornerResult, hqResult] = await Promise.allSettled([
        wantEporner  ? axios.get(epornerUrl)        : Promise.resolve(null),
        wantHQPorner ? scrapeHQSearch(search, page) : Promise.resolve([]),
      ]);

      /* --- eporner results (existing mapping, untouched) --- */
      let epornerVideos = [];
      if (wantEporner && epornerResult.status === "fulfilled" && epornerResult.value) {
        const apiVideos = epornerResult.value.data?.videos || [];
        epornerVideos = apiVideos.map((v) => ({
          id:        v.id,
          title:     v.title,
          url:       v.embed?.iframe || v.embed || v.url,
          type:      "eporner",
          thumbnail: v.default_thumb?.src || v.thumbs?.[0],
          duration:  v.length_min || "0:00",
          views:     v.views || 0,
          creatorId: v.pornstars?.[0] || "Eporner",
        }));
      }

      /* --- HQPorner live-scraped results --- */
      let hqVideos = [];
      if (wantHQPorner && hqResult.status === "fulfilled") {
        hqVideos = hqResult.value || [];
      }

      /* --- combine --- */
      const videos =
        wantEporner && wantHQPorner
          ? interleave(epornerVideos, hqVideos)
          : wantEporner
          ? epornerVideos
          : hqVideos;

      const eTotal = wantEporner && epornerResult.status === "fulfilled" && epornerResult.value
        ? epornerResult.value.data?.total_count || epornerVideos.length
        : 0;

      return res.json({
        page,
        limit,
        total: eTotal + hqVideos.length,
        videos,
      });
    }

    /* ──────────────── SOURCE FILTER MODE (no search) ────────────────
     * User picked a specific source — query only that type from DB.
     */
    if (source === "eporner" || source === "hqporner") {
      const filter = { type: source };
      if (req.query.creator)  filter.creatorId = req.query.creator;
      if (req.query.category) filter.category  = req.query.category;

      const videos = await Video.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Video.countDocuments(filter);
      return res.json({ page, limit, total, videos });
    }

    /* ──────────────── NORMAL FEED (mixed / interleaved) ──────────────── */
    const half = Math.ceil(limit / 2);
    const skip = (page - 1) * half;

    const baseFilter = {};
    if (req.query.creator)  baseFilter.creatorId = req.query.creator;
    if (req.query.category) baseFilter.category  = req.query.category;

    const [epornerVideos, hqpornerVideos, total] = await Promise.all([
      Video.find({ ...baseFilter, type: "eporner" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(half)
        .lean(),
      Video.find({ ...baseFilter, type: "hqporner" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(half)
        .lean(),
      Video.countDocuments(baseFilter),
    ]);

    const videos = interleave(epornerVideos, hqpornerVideos);
    return res.json({ page, limit, total, videos });

  } catch (err) {
    console.error("Video route error:", err);
    return res.json({ page: 1, limit: 20, total: 0, videos: [] });
  }
});

/* ────────────────────────────────────────────────────────
   GET /videos/:id
──────────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/like", auth, async (_req, res) => res.json({ message: "Liked" }));
router.post("/:id/save", auth, async (_req, res) => res.json({ message: "Saved" }));

module.exports = router;
