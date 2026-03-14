const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");
require("dotenv").config();

const videoRoutes   = require("./routes/videos");
const creatorRoutes = require("./routes/creators");
const authRoutes    = require("./routes/auth");
const resolveRoute  = require("./routes/resolve");
const streamRoute   = require("./routes/stream");   // ← NEW
const { runScraper: scrapeVideos } = require("./scraper/scrape");

const app  = express();
const PORT = process.env.PORT || 5000;

/* ------------------- MIDDLEWARE ------------------- */

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* ------------------- DATABASE ------------------- */

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* ------------------- ROUTES ------------------- */

// Order matters: more-specific paths first
app.use("/api/stream",         streamRoute);   // ← NEW — CDN proxy
app.use("/api/videos/resolve", resolveRoute);
app.use("/api/videos",         videoRoutes);
app.use("/api/creators",       creatorRoutes);
app.use("/api/auth",           authRoutes);

/* ------------------- SCRAPER CONTROL ------------------- */

let scraping = false;

async function runScraper() {
  if (scraping) {
    console.log("Scraper already running, skipping...");
    return;
  }
  scraping = true;
  try {
    console.log("Starting scraper...");
    await scrapeVideos();
    console.log("Scraper finished");
  } catch (err) {
    console.error("Scraper error:", err);
  }
  scraping = false;
}

/* ------------------- INITIAL SCRAPE ------------------- */

setTimeout(() => {
  runScraper();
}, 5000);

/* ------------------- CRON SCRAPE ------------------- */

cron.schedule("0 */6 * * *", () => {
  console.log("Running scheduled scrape...");
  runScraper();
});

/* ------------------- HEALTH CHECK ------------------- */

app.get("/api/health", (req, res) => {
  res.send("Backend alive");
});

/* ------------------- SERVE FRONTEND ------------------- */

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ------------------- SERVER START ------------------- */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
