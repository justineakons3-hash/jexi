const express = require("express");
const Creator = require("../models/Creator");

const router = express.Router();

/* ------------------------------------------------ */
/* GET /creators                                    */
/* Returns all creators from MongoDB sorted by name */
/* ------------------------------------------------ */

router.get("/", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 100; // large default — creators page loads all
    const search = req.query.search?.trim();

    const filter = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const [creators, total] = await Promise.all([
      Creator.find(filter)
        .sort({ name: 1 })           // alphabetical — followers are all 0 from scrape
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Creator.countDocuments(filter),
    ]);

    // FIX: App.tsx reads `creatorsRes.data.creators` — was returning bare array
    // which made creatorsRes.data.creators undefined and creators stayed as
    // INITIAL_CREATORS forever.
    res.json({ page, limit, total, creators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------ */
/* GET /creators/:id                                */
/* ------------------------------------------------ */

router.get("/:id", async (req, res) => {
  try {
    // Support lookup by custom string `id` field OR MongoDB _id
    const creator =
      (await Creator.findOne({ id: req.params.id }).lean()) ||
      (await Creator.findById(req.params.id).lean());

    if (!creator) return res.status(404).json({ error: "Creator not found" });
    res.json(creator);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
