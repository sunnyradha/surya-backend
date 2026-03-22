const mongoose = require("mongoose");

const Enquiry = require("../models/Enquiry");
const Office = require("../models/Office");

const DUPLICATE_BLOCK_SECONDS = 30;
const REQUEST_TYPES = ["enquiry", "visit"];

const parsePreferredDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const createEnquiry = async (req, res) => {
  try {
    const { name, phone, message, officeId, requestType = "enquiry", preferredDate } = req.body;

    const normalizedRequestType = String(requestType || "enquiry").toLowerCase().trim();
    const normalizedMessage = String(message || "").trim();
    const normalizedPhone = String(phone || "").trim();
    const parsedPreferredDate = parsePreferredDate(preferredDate);

    if (!name || !normalizedPhone || !officeId) {
      return res.status(400).json({ message: "All enquiry fields are required" });
    }

    if (!REQUEST_TYPES.includes(normalizedRequestType)) {
      return res.status(400).json({ message: "Invalid request type" });
    }

    if (normalizedRequestType === "enquiry" && !normalizedMessage) {
      return res.status(400).json({ message: "Message is required for enquiry" });
    }

    if (normalizedRequestType === "visit" && !parsedPreferredDate) {
      return res.status(400).json({ message: "Preferred visit date is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(officeId)) {
      return res.status(400).json({ message: "Invalid office id" });
    }

    const officeExists = await Office.exists({ _id: officeId });
    if (!officeExists) {
      return res.status(404).json({ message: "Office not found" });
    }

    const duplicateWindowStart = new Date(Date.now() - DUPLICATE_BLOCK_SECONDS * 1000);

    const recentDuplicate = await Enquiry.findOne({
      phone: normalizedPhone,
      officeId,
      requestType: normalizedRequestType,
      createdAt: { $gte: duplicateWindowStart }
    }).lean();

    if (recentDuplicate) {
      return res.status(429).json({
        success: false,
        message: "Please wait before submitting the same enquiry again"
      });
    }

    const enquiry = await Enquiry.create({
      name: String(name).trim(),
      phone: normalizedPhone,
      message: normalizedMessage || "Visit booking request",
      officeId,
      requestType: normalizedRequestType,
      preferredDate: parsedPreferredDate
    });

    return res.status(201).json(enquiry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create enquiry" });
  }
};

const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate("officeId", "title floor type status")
      .sort({ createdAt: -1 });

    return res.status(200).json(enquiries);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch enquiries" });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid enquiry id" });
    }

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    enquiry.status = String(status).toLowerCase().trim();
    await enquiry.save();

    return res.status(200).json(enquiry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update enquiry status" });
  }
};

module.exports = {
  createEnquiry,
  getAllEnquiries,
  updateEnquiryStatus
};
