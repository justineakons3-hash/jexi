const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create default user if none exists (for personal use)
router.post("/setup", async (req, res) => {
  try {
    const existing = await User.findOne();
    if (existing) return res.status(400).json({ error: "User exists" });
    const user = new User({
      email: process.env.DEFAULT_EMAIL,
      password: process.env.DEFAULT_PASSWORD,
    });
    await user.save();
    res.json({ message: "Default user created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
