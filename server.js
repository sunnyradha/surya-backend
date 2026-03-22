require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const seedDefaultAdmin = require("./config/seedAdmin");

const adminRoutes = require("./routes/adminRoutes");
const officeRoutes = require("./routes/officeRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    frameguard: { action: "deny" },
    xssFilter: true
  })
);
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
  })
);

app.use("/api/admin", adminRoutes);
app.use("/api", officeRoutes);
app.use("/api", enquiryRoutes);

app.get("/health", (req, res) => {
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  res.status(200).json({
    status: "ok",
    db: dbStateMap[mongoose.connection.readyState] || "unknown"
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ message: err.message });
  }

  if (err) {
    console.error("Unhandled error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }

  return next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are missing in environment variables");
    }

    await connectDB();
    await seedDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
