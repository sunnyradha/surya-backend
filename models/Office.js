const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    floor: {
      type: String,
      required: true,
      trim: true
    },
    area: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    rent: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ["rent", "buy", "both"],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    amenities: {
      type: [String],
      default: []
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["available", "sold", "rented"],
      default: "available"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Office", officeSchema);
