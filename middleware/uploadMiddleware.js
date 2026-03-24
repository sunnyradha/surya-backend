const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// If S3 is configured we'll use memory storage and upload files to S3 in the
// controller. Otherwise fall back to disk storage under backend/uploads.
const useS3 = !!(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY && process.env.S3_SECRET);

const uploadDir = path.join(__dirname, "..", "uploads");

if (!useS3) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID();
    cb(null, `${Date.now()}-${uniqueId}${extension}`);
  }
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(extension)) {
    return cb(new Error("Only image files are allowed"));
  }

  return cb(null, true);
};

const storage = useS3 ? memoryStorage : diskStorage;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

module.exports = upload;
