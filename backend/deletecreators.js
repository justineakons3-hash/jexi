require("dotenv").config();
const mongoose = require("mongoose");
const Creator = require("./models/Creator"); // change model

async function clearCreators() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const result = await Creator.deleteMany({});

    console.log(`Deleted ${result.deletedCount} creators`);

    await mongoose.connection.close();

    console.log("Creators collection cleared");
  } catch (err) {
    console.error("Error clearing creators:", err);
  }
}

clearCreators();
