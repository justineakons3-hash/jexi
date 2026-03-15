const router = require("express").Router();
const auth   = require("../middleware/auth");
const User   = require("../models/User");
const Video  = require("../models/Videos");

// JWT is signed with { userId: user._id } in routes/auth.js
const getUserId = (req) => req.user.userId;

// Helper — if the video doesn't exist in MongoDB yet, insert it.
// This handles search-result videos that are never scraped into the DB.
const upsertVideo = async (videoData) => {
  if (!videoData || !videoData.id) return;
  try {
    await Video.findOneAndUpdate(
      { id: videoData.id },
      { $setOnInsert: videoData },
      { upsert: true, new: false }
    );
  } catch (err) {
    // Duplicate key on race condition — safe to ignore
    if (err.code !== 11000) console.error("Video upsert error:", err);
  }
};

// GET /api/user/interactions
router.get("/interactions", auth, async (req, res) => {
  try {
    const user = await User.findById(getUserId(req)).select("savedVideoIds likedVideoIds");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ savedVideoIds: user.savedVideoIds, likedVideoIds: user.likedVideoIds });
  } catch (err) {
    console.error("GET /interactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user/save/:videoId
// Body: { video?: VideoObject }  — optional, sent for search-result videos
router.post("/save/:videoId", auth, async (req, res) => {
  try {
    // Persist video to DB if provided (search results aren't scraped)
    if (req.body.video) await upsertVideo(req.body.video);

    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });

    const idx = user.savedVideoIds.indexOf(req.params.videoId);
    if (idx > -1) user.savedVideoIds.splice(idx, 1);
    else          user.savedVideoIds.push(req.params.videoId);

    await user.save();
    res.json({ savedVideoIds: user.savedVideoIds });
  } catch (err) {
    console.error("POST /save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user/like/:videoId
// Body: { video?: VideoObject }  — optional, sent for search-result videos
router.post("/like/:videoId", auth, async (req, res) => {
  try {
    // Persist video to DB if provided (search results aren't scraped)
    if (req.body.video) await upsertVideo(req.body.video);

    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ message: "User not found" });

    const idx = user.likedVideoIds.indexOf(req.params.videoId);
    if (idx > -1) user.likedVideoIds.splice(idx, 1);
    else          user.likedVideoIds.push(req.params.videoId);

    await user.save();
    res.json({ likedVideoIds: user.likedVideoIds });
  } catch (err) {
    console.error("POST /like error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
