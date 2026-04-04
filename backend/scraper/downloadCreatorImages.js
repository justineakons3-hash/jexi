/**
 * downloadCreatorImages.js — LOCAL BACKUP SCRIPT
 *
 * Downloads all creator avatar images from MongoDB to a local folder.
 * Each image is saved as "Firstname Lastname.jpg" (the creator's name).
 * Also generates a manifest.json listing every creator + local filename.
 *
 * Usage:
 *   MONGODB_URI=your_uri node downloadCreatorImages.js
 *   or: node -r dotenv/config downloadCreatorImages.js
 *
 * Output:
 *   ./creator_images/
 *     Aali Kali.jpg
 *     Aaliyah Grey.jpg
 *     ...
 *     manifest.json
 *
 * Notes:
 *   - Safe to re-run: skips images that already exist on disk
 *   - Polite 300ms delay between requests to avoid hammering the source
 *   - Failed downloads are logged to failed.json for manual retry
 */

require("dotenv").config();
const axios    = require("axios");
const mongoose = require("mongoose");
const fs       = require("fs");
const path     = require("path");

/* ---- inline schema so script runs standalone ---- */
const creatorSchema = new mongoose.Schema({
  id:     { type: String, required: true, unique: true },
  name:   { type: String, required: true },
  avatar: { type: String, required: true },
});
const Creator = mongoose.models.Creator || mongoose.model("Creator", creatorSchema);

/* ---- config ---- */
const OUTPUT_DIR = path.join(__dirname, "creator_images");
const DELAY_MS   = 300;   // ms between downloads — be polite
const BATCH_SIZE = 20;    // download N at a time (not all 5000+ at once)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sanitize a name so it's safe as a filename on Windows/Mac/Linux.
 * Removes characters that are illegal in filenames.
 */
function safeName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "") // remove illegal chars
    .replace(/\.+$/, "")                     // no trailing dots
    .trim();
}

/**
 * Download a single image and save it to disk.
 * Returns { ok: true, file } or { ok: false, reason }.
 */
async function downloadImage(url, destPath) {
  // Skip if already downloaded
  if (fs.existsSync(destPath)) {
    return { ok: true, skipped: true };
  }

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://www.mypornstarbook.net/",
      },
    });

    // Verify we actually got an image, not an HTML error page
    const contentType = res.headers["content-type"] || "";
    if (!contentType.startsWith("image/")) {
      return { ok: false, reason: `Not an image (${contentType})` };
    }

    fs.writeFileSync(destPath, Buffer.from(res.data));
    return { ok: true, skipped: false };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/* ---- main ---- */

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(mongoUri);
  console.log("Connected.\n");

  const total = await Creator.countDocuments({});
  console.log(`Found ${total} creators in database.\n`);

  let downloaded = 0;
  let skipped    = 0;
  let failed     = 0;
  const failedList  = [];
  const manifest    = [];

  // Process in batches to keep memory usage low
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const creators = await Creator.find({})
      .sort({ name: 1 })
      .skip(offset)
      .limit(BATCH_SIZE)
      .lean();

    for (const creator of creators) {
      const fileName = `${safeName(creator.name)}.jpg`;
      const destPath = path.join(OUTPUT_DIR, fileName);

      process.stdout.write(
        `[${offset + downloaded + skipped + failed + 1}/${total}] ${creator.name}… `
      );

      const result = await downloadImage(creator.avatar, destPath);

      if (result.ok && result.skipped) {
        console.log("skipped (exists)");
        skipped++;
      } else if (result.ok) {
        console.log("✓");
        downloaded++;
      } else {
        console.log(`✗ ${result.reason}`);
        failed++;
        failedList.push({
          id:     creator.id,
          name:   creator.name,
          avatar: creator.avatar,
          reason: result.reason,
        });
      }

      // Add to manifest regardless of success
      manifest.push({
        id:        creator.id,
        name:      creator.name,
        avatar:    creator.avatar,       // original remote URL
        localFile: result.ok ? fileName : null,
      });

      await sleep(DELAY_MS);
    }
  }

  // Write manifest.json
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written → ${manifestPath}`);

  // Write failed.json if any failures
  if (failedList.length > 0) {
    const failedPath = path.join(OUTPUT_DIR, "failed.json");
    fs.writeFileSync(failedPath, JSON.stringify(failedList, null, 2));
    console.log(`Failed list written → ${failedPath}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total:      ${total}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped:    ${skipped} (already existed)`);
  console.log(`Failed:     ${failed}`);
  console.log(`\nImages saved to: ${OUTPUT_DIR}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
