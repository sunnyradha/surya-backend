const mongoose = require("mongoose");

const Office = require("../models/Office");

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const useS3 = !!(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY && process.env.S3_SECRET);

let s3Client = null;
let s3Bucket = null;
let s3Region = null;

if (useS3) {
  try {
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    s3Region = process.env.S3_REGION;
    s3Bucket = process.env.S3_BUCKET;
    s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET
      }
    });

    // helper to upload a buffer to S3 and return the accessible URL
    var uploadBufferToS3 = async (buffer, originalName) => {
      const path = require("path");
      const crypto = require("crypto");
      const extension = path.extname(originalName || "").toLowerCase();
      const key = `uploads/${Date.now()}-${crypto.randomUUID()}${extension}`;

      const command = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: (extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg"),
        ACL: "public-read"
      });

      await s3Client.send(command);

      // Construct public URL. This is the standard S3 URL; some providers differ.
      const url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`;
      return url;
    };
  } catch (err) {
    console.warn("S3 client could not be initialized. Make sure @aws-sdk/client-s3 is installed and env vars are correct.", err.message);
    s3Client = null;
  }
}

const parseAmenities = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Ignore JSON parse error and treat as comma-separated text.
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseImageList = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return String(item.url || item.path || item.location || item.filename || item.src || "").trim().replace(/\\/g, "/");
        }

        return String(item || "").trim().replace(/\\/g, "/");
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return parseImageList([
      value.url,
      value.path,
      value.location,
      value.filename,
      value.src
    ]);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim().replace(/\\/g, "/"))
          .filter(Boolean);
      }
    } catch (error) {
      // Ignore JSON parse error and treat as comma-separated text.
    }

    return value
      .split(",")
      .map((item) => item.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  }

  return [];
};

const normalizeOfficeResponse = (office) => {
  const base = office?.toObject ? office.toObject() : office;

  if (!base) {
    return base;
  }

  const normalizedImages = parseImageList(
    base.images ?? base.imageUrls ?? base.imageUrl ?? base.image ?? base.photos
  );

  const fallbackImages = normalizedImages.length > 0
    ? normalizedImages
    : parseImageList([
      base.featuredImage,
      base.thumbnail,
      base.media,
      base.gallery,
      base.attachments
    ]);

  return {
    ...base,
    images: fallbackImages,
    amenities: parseAmenities(base.amenities)
  };
};

const getAllOffices = async (req, res) => {
  try {
    const offices = await Office.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(offices.map((office) => normalizeOfficeResponse(office)));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch offices" });
  }
};

const getOfficeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid office id" });
    }

    const office = await Office.findById(id).lean();
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    return res.status(200).json(normalizeOfficeResponse(office));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch office" });
  }
};

const createOffice = async (req, res) => {
  try {
    const {
      title,
      floor,
      area,
      price,
      rent,
      type,
      description,
      amenities,
      status = "available"
    } = req.body;

    const normalizedType = String(type || "").toLowerCase().trim();
    const normalizedStatus = String(status || "available").toLowerCase().trim();

    if (!title || !floor || area === undefined || price === undefined || rent === undefined || !normalizedType || !description) {
      return res.status(400).json({ message: "All required office fields must be provided" });
    }

    const parsedArea = toNumberOrUndefined(area);
    const parsedPrice = toNumberOrUndefined(price);
    const parsedRent = toNumberOrUndefined(rent);

    if (parsedArea === undefined || parsedPrice === undefined || parsedRent === undefined) {
      return res.status(400).json({ message: "Area, price and rent must be valid numbers" });
    }

    const images = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const normalizedAmenities = parseAmenities(amenities);

    // if S3 is enabled, uploaded files are in memory and need to be uploaded to S3
    let finalImages = images;

    if (useS3 && req.files && req.files.length > 0 && typeof uploadBufferToS3 === "function") {
      const uploaded = [];
      for (const file of req.files) {
        // multer memory storage puts buffer on file.buffer
        if (!file.buffer) continue;
        try {
          const url = await uploadBufferToS3(file.buffer, file.originalname);
          uploaded.push(url);
        } catch (err) {
          console.error("Failed to upload to S3:", err.message);
        }
      }
      finalImages = [...(parseImageList(req.body.existingImages || []) || []), ...uploaded];
    }

    const office = await Office.create({
      title,
      floor,
      area: parsedArea,
      price: parsedPrice,
      rent: parsedRent,
      type: normalizedType,
      description,
      amenities: normalizedAmenities,
      status: normalizedStatus,
      images: finalImages
    });

    return res.status(201).json(normalizeOfficeResponse(office));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create office" });
  }
};

const updateOffice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid office id" });
    }

    const office = await Office.findById(id);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    const updatableFields = [
      "title",
      "floor",
      "area",
      "price",
      "rent",
      "type",
      "description",
      "amenities",
      "status"
    ];

    let hasInvalidNumber = false;

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (["area", "price", "rent"].includes(field)) {
          const parsedValue = toNumberOrUndefined(req.body[field]);
          if (parsedValue === undefined) {
            hasInvalidNumber = true;
            return;
          }

          office[field] = parsedValue;
          return;
        }

        if (["type", "status"].includes(field)) {
          office[field] = String(req.body[field]).toLowerCase().trim();
          return;
        }

        if (field === "amenities") {
          office.amenities = parseAmenities(req.body[field]);
          return;
        }

        office[field] = req.body[field];
      }
    });

    if (hasInvalidNumber) {
      return res.status(400).json({ message: "Area, price and rent must be valid numbers" });
    }

    const hasExistingImagesField = req.body.existingImages !== undefined;
    const uploadedImages = (req.files || []).map((file) => `/uploads/${file.filename}`);

    // If S3 is enabled, upload any memory files and build URLs
    let s3Uploaded = [];
    if (useS3 && req.files && req.files.length > 0 && typeof uploadBufferToS3 === "function") {
      for (const file of req.files) {
        if (!file.buffer) continue;
        try {
          const url = await uploadBufferToS3(file.buffer, file.originalname);
          s3Uploaded.push(url);
        } catch (err) {
          console.error("Failed to upload to S3 during update:", err.message);
        }
      }
    }

    const candidateUploaded = useS3 ? s3Uploaded : uploadedImages;

    if (hasExistingImagesField || candidateUploaded.length > 0) {
      const retainedImages = hasExistingImagesField ? parseImageList(req.body.existingImages) : parseImageList(office.images);
      office.images = [...retainedImages, ...candidateUploaded];
    }

    await office.save();
    return res.status(200).json(normalizeOfficeResponse(office));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update office" });
  }
};

const deleteOffice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid office id" });
    }

    const office = await Office.findByIdAndDelete(id);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    return res.status(200).json({ message: "Office deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete office" });
  }
};

module.exports = {
  getAllOffices,
  getOfficeById,
  createOffice,
  updateOffice,
  deleteOffice
};
