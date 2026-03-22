const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true
    },
    requestType: {
      type: String,
      enum: ["enquiry", "visit"],
      default: "enquiry"
    },
    preferredDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["pending", "contacted"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

// Helps fast lookup for anti-spam duplicate checks.
enquirySchema.index({ phone: 1, officeId: 1, requestType: 1, createdAt: -1 });

module.exports = mongoose.model("Enquiry", enquirySchema);
