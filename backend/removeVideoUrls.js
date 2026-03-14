require("dotenv").config();
const mongoose = require("mongoose");
const Video = require("./models/Videos");

async function clearVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const result = await Video.deleteMany({});

    console.log(`Deleted ${result.deletedCount} videos`);

    await mongoose.connection.close();

    console.log("Database cleared");
  } catch (err) {
    console.error("Error clearing videos:", err);
  }
}

clearVideos();
