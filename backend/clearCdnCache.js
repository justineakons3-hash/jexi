/**
 * clearCdnCache.js
 *
 * One-time script: clears cdnUrl and cdnQualities from all hqporner
 * videos so they get re-resolved through the new /api/stream proxy.
 *
 * Run once on your server after deploying the fix:
 *   node clearCdnCache.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Video    = require("./models/Videos");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("Connected to MongoDB");

  const result = await Video.updateMany(
    { type: "hqporner" },
    { $unset: { cdnUrl: "", cdnQualities: "" } }
  );

  console.log(`Cleared CDN cache for ${result.modifiedCount} videos`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
