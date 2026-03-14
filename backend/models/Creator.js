const mongoose = require("mongoose");

const creatorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, required: true },
  bio: String,
  followers: { type: Number, default: 0 },
});

module.exports = mongoose.model("Creator", creatorSchema);
