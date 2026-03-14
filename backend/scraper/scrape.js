const axios = require("axios");
const Video = require("../models/Videos");
const Creator = require("../models/Creator");
const { spawn } = require("child_process");

const EPORNER_API = process.env.EPORNER_API_URL;

function normalizeViews(raw) {
  if (!raw && raw !== 0) return 0;
  if (typeof raw === "number") return Math.floor(raw);

  const s = String(raw).replace(/,/g, "").trim().toUpperCase();
  if (s.endsWith("M")) return Math.floor(parseFloat(s) * 1_000_000);
  if (s.endsWith("K")) return Math.floor(parseFloat(s) * 1_000);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.floor(n);
}

async function getOrCreateCreator(name) {
  let creator = await Creator.findOne({ name });

  if (!creator) {
    creator = new Creator({
      id: `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name,
      avatar: "https://via.placeholder.com/100?text=Creator",
    });

    await creator.save();
  }

  return creator;
}

/* ------------------- EPORNER SCRAPER ------------------- */

async function scrapeEporner() {
  try {
    if (!EPORNER_API) {
      console.error("EPORNER_API_URL missing in .env");
      return;
    }

    const res = await axios.get(EPORNER_API);
    const videos = res.data.videos || [];

    let saved = 0;
    for (const vid of videos) {
      const id = vid.id;

      const existing = await Video.findOne({ id });
      if (existing) continue;

      const creatorName = vid.pornstars?.[0] || "Eporner";
      const creator = await getOrCreateCreator(creatorName);

      const video = new Video({
        id,
        title:       vid.title,
        url:         vid.embed || vid.url,
        type:        "eporner",
        creatorId:   creator.id,
        thumbnail:   vid.default_thumb?.src || vid.thumbs?.[0],
        description: vid.description || "",
        duration:    vid.length_min || "Unknown",
        views:       normalizeViews(vid.views),
      });

      await video.save();
      saved++;
    }

    console.log(`Eporner: ${videos.length} processed, ${saved} new saved`);
  } catch (err) {
    console.error("Eporner scrape error:", err.message);
  }
}

/* ------------------- HQPORNER SCRAPER ------------------- */

async function scrapeHqporner() {
  return new Promise((resolve, reject) => {
    const py = spawn("python", ["./scraper/script.py"]);

    let data    = "";
    let errData = "";

    py.stdout.on("data", (chunk) => { data    += chunk.toString(); });
    py.stderr.on("data", (chunk) => { errData += chunk.toString(); });

    py.on("close", async (code) => {
      // stderr = progress logs only (intentionally written there by script.py
      // so they don't corrupt the JSON stdout). Always log, never reject on it.
      if (errData.trim()) {
        console.log("HQPorner scraper log:\n" + errData.trim());
      }

      // Exit code is the real error signal — 0 = success
      if (code !== 0) {
        return reject(new Error(`HQPorner python exited with code ${code}`));
      }

      if (!data.trim()) {
        return reject(new Error("HQPorner python produced no output"));
      }

      try {
        const videos = JSON.parse(data);

        let saved = 0;
        for (const vid of videos) {
          const existing = await Video.findOne({ id: vid.id });
          if (existing) continue;

          const creatorName = vid.pornstar || "HQPorner";
          const creator = await getOrCreateCreator(creatorName);

          const video = new Video({
            id:        vid.id,
            title:     vid.title,
            url:       vid.page || vid.url,
            type:      "hqporner",
            creatorId: creator.id,
            thumbnail: vid.thumbnail,
            duration:  vid.duration || "Unknown",
            views:     normalizeViews(vid.views),
          });

          await video.save();
          saved++;
        }

        console.log(`HQPorner: ${videos.length} processed, ${saved} new saved`);
        resolve();

      } catch (err) {
        reject(new Error(`HQPorner JSON parse error: ${err.message}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });
  });
}

/* ------------------- MAIN EXPORT ------------------- */

async function runScraper() {
  console.log("Starting scraper...");
  await scrapeEporner();

  try {
    await scrapeHqporner();
  } catch (err) {
    console.error("HQPorner scrape failed:", err.message);
  }
}

module.exports = { runScraper };
