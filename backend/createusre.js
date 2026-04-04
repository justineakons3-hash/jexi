require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const existingUser = await User.findOne({ email: "admin@example.com" });

    if (existingUser) {
      console.log("User already exists");
      process.exit();
    }

    const user = new User({
      email: "uma@gmail.com",
      password: "uma123",
    });

    await user.save();

    console.log("User created successfully");
    process.exit();
  } catch (err) {
    console.error("Error creating user:", err);
    process.exit(1);
  }
}

createUser();
