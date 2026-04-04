/**
 * scrapeCreators.js — ONE-TIME SCRIPT
 *
 * Scrapes all pornstar names + avatar URLs from mypornstarbook.net,
 * then upserts them into MongoDB as Creator documents.
 *
 * Run with:
 *   MONGODB_URI=<your-uri> node scrapeCreators.js
 *
 * Or if your project already loads .env:
 *   node -r dotenv/config scrapeCreators.js
 *
 * Safe to re-run — uses upsert so existing creators are not duplicated.
 */

require("dotenv").config();
const axios   = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");

/* ---- inline Creator schema (avoids import path issues when run standalone) ---- */
const creatorSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  avatar:    { type: String, required: true },
  bio:       String,
  followers: { type: Number, default: 0 },
});
const Creator = mongoose.models.Creator || mongoose.model("Creator", creatorSchema);

/* ---- config ---- */
const BASE      = "https://www.mypornstarbook.net";
const DELAY_MS  = 800;   // polite delay between page requests
const MAX_PAGES = 30;    // safety cap — raise if the site has more pages

/* ---- helpers ---- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Convert a URL slug like "abby_lee_brazil" → "Abby Lee Brazil"
 * Used as fallback if the alt text is missing.
 */
function slugToName(slug) {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Scrape one page of the all-porno-stars list.
 * Returns array of { name, avatar } objects, or [] if the page 404s / is empty.
 */
async function scrapePage(pageNum) {
  const url = `${BASE}/pornstars/all-porno-stars${pageNum}.php`;

  let html;
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        // Mimic a real browser so the site doesn't reject the request
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    html = res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return null; // signal: no more pages
    }
    console.error(`  Page ${pageNum} fetch error: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  /*
   * The page contains anchors wrapping images like:
   *   <a href="/pornstars/a/aali_kali/index.php">
   *     <img src="/pornstars/a/aali_kali/face.jpg" alt="Aali Kali">
   *   </a>
   *
   * We extract name from alt text and build the full avatar URL from src.
   */
  $("img[src*='/pornstars/'][src*='/face.jpg']").each((_, el) => {
    const src  = $(el).attr("src") || "";
    const alt  = ($(el).attr("alt") || "").trim();

    if (!src) return;

    // Build absolute avatar URL
    const avatar = src.startsWith("http") ? src : `${BASE}${src}`;

    // Extract slug from path: /pornstars/a/aali_kali/face.jpg → aali_kali
    const match = src.match(/\/pornstars\/[a-z0-9]\/([^/]+)\/face\.jpg/i);
    if (!match) return;

    const slug = match[1];
    const name = alt || slugToName(slug);

    // Use slug as the stable unique id — consistent across re-runs
    results.push({ id: `ps_${slug}`, name, avatar });
  });

  return results;
}

/* ---- main ---- */

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(mongoUri);
  console.log("Connected.\n");

  let totalScraped = 0;
  let totalSaved   = 0;
  let totalSkipped = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Scraping page ${page}…`);
    const entries = await scrapePage(page);

    // null means 404 — no more pages
    if (entries === null) {
      console.log(`  Page ${page} returned 404 — done.\n`);
      break;
    }

    if (entries.length === 0) {
      console.log(`  Page ${page} had no entries, skipping.`);
      await sleep(DELAY_MS);
      continue;
    }

    console.log(`  Found ${entries.length} creators on page ${page}.`);
    totalScraped += entries.length;

    // Upsert each creator — safe to re-run
    for (const entry of entries) {
      try {
        const result = await Creator.updateOne(
          { id: entry.id },
          {
            $setOnInsert: {
              id:        entry.id,
              name:      entry.name,
              avatar:    entry.avatar,
              followers: 0,
            },
          },
          { upsert: true },
        );

        if (result.upsertedCount > 0) {
          totalSaved++;
        } else {
          totalSkipped++;
        }
      } catch (err) {
        console.error(`  Failed to save ${entry.name}: ${err.message}`);
      }
    }

    // Polite delay between pages
    await sleep(DELAY_MS);
  }

  console.log("\n=== DONE ===");
  console.log(`Scraped:  ${totalScraped} creators`);
  console.log(`Saved:    ${totalSaved} new creators inserted`);
  console.log(`Skipped:  ${totalSkipped} already existed`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
