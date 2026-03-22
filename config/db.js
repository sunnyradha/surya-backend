const mongoose = require("mongoose");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : "";
  const maxRetries = Number(process.env.MONGO_RETRY_ATTEMPTS || 5);
  const retryDelayMs = Number(process.env.MONGO_RETRY_DELAY_MS || 3000);

  if (!mongoURI) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000
      });

      console.log("MongoDB connected");
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(
        `MongoDB connection failed (attempt ${attempt}/${maxRetries}): ${error.message}`
      );

      if (isLastAttempt) {
        throw new Error("Unable to connect to MongoDB after multiple attempts");
      }

      await delay(retryDelayMs);
    }
  }
};

module.exports = connectDB;
