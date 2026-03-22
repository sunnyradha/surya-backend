const mongoose = require("mongoose");

const Office = require("../models/Office");

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

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
      images
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

    if (hasExistingImagesField || uploadedImages.length > 0) {
      const retainedImages = hasExistingImagesField ? parseImageList(req.body.existingImages) : parseImageList(office.images);
      office.images = [...retainedImages, ...uploadedImages];
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
