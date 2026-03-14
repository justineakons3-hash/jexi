const express = require("express");
const axios = require("axios");
const Video = require("../models/Videos");
const auth = require("../middleware/auth");

const router = express.Router();

/* ------------------------------------------------ */
/* HELPER: interleave two arrays evenly             */
/* [a1,a2,a3] + [b1,b2,b3] → [a1,b1,a2,b2,a3,b3] */
/* ------------------------------------------------ */

function interleave(a, b) {
  const result = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

/* ------------------------------------------------ */
/* GET /videos/top10                                */
/* ------------------------------------------------ */

router.get("/top10", async (req, res) => {
  try {
    const videos = await Video.find({})
      .sort({ views: -1 })
      .limit(10)
      .lean();

    return res.json({ videos });
  } catch (err) {
    console.error("Top10 route error:", err);
    return res.json({ videos: [] });
  }
});

/* ------------------------------------------------ */
/* GET /videos (Feed + Search)                      */
/* ------------------------------------------------ */

router.get("/", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const source = req.query.source; // "eporner" | "hqporner" | undefined

    console.log("Incoming Query:", req.query);

    /* ---------------- SEARCH MODE ---------------- */

    if (search && search.trim() !== "") {
      const apiUrl =
        `https://www.eporner.com/api/v2/video/search/` +
        `?query=${encodeURIComponent(search)}` +
        `&per_page=${limit}` +
        `&page=${page}` +
        `&thumbsize=big` +
        `&order=latest` +
        `&format=json`;

      const response = await axios.get(apiUrl);
      const apiVideos = response.data.videos || [];

      const videos = apiVideos.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.embed?.iframe || v.embed || v.url,
        type: "eporner",
        thumbnail: v.default_thumb?.src || v.thumbs?.[0],
        duration: v.length_min || "0:00",
        views: v.views || 0,
        creatorId: v.pornstars?.[0] || "Eporner",
      }));

      return res.json({
        page,
        limit,
        total: response.data.total_count || videos.length,
        videos,
      });
    }

    /* ---------------- SOURCE FILTER MODE ----------------
     * When the user picks a specific source (eporner/hqporner),
     * query only that type with normal pagination.
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

    /* ---------------- NORMAL FEED (mixed/interleaved) ----------------
     * Problem: videos were scraped in bulk — all eporner first, then all
     * hqporner (or vice versa). Sorting by createdAt returns them in that
     * same batch order, so the user sees 200 eporner videos then 267 hqporner.
     *
     * Fix: fetch half the page limit from each source separately, then
     * interleave them (e1, hq1, e2, hq2, ...) before returning.
     * This is 2 fast indexed queries — safe on Render free tier.
     * Each source is paginated independently using half-limit offsets.
     */

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

/* ------------------------------------------------ */
/* GET /videos/:id                                  */
/* ------------------------------------------------ */

router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------ */
/* LIKE / SAVE                                      */
/* ------------------------------------------------ */

router.post("/:id/like", auth, async (req, res) => {
  res.json({ message: "Liked" });
});

router.post("/:id/save", auth, async (req, res) => {
  res.json({ message: "Saved" });
});

module.exports = router;
