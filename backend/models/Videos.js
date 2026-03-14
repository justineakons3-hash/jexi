const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  id: { type: String, required: true },

  title: { type: String, required: true },
  url: { type: String, required: true },

  type: {
    type: String,
    enum: ["eporner", "hqporner", "mp4"],
    default: "eporner",
  },

  creatorId: { type: String, required: true },

  category: String,

  collaboratorIds: [String],

  thumbnail: { type: String, required: true },

  description: String,
  duration: String,

  views: Number,

  createdAt: { type: Date, default: Date.now },

  rating: { type: Number, default: 4.5 },
  weeklyViews: { type: Number, default: 0 },
  monthlyViews: { type: Number, default: 0 },
});

videoSchema.index({ id: 1 }, { unique: true });
videoSchema.index({ createdAt: -1, id: 1 });
videoSchema.index({ creatorId: 1 });
videoSchema.index({ category: 1 });

module.exports = mongoose.model("Video", videoSchema);
