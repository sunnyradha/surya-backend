const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    singletonKey: {
      type: String,
      default: "main",
      unique: true,
      immutable: true
    }
  },
  {
    timestamps: true
  }
);

// Enforces a single-admin system at schema level.
adminSchema.pre("save", async function enforceSingleAdmin(next) {
  try {
    if (!this.isNew) {
      return next();
    }

    const adminCount = await this.constructor.countDocuments();
    if (adminCount > 0) {
      return next(new Error("Only one admin user is allowed"));
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("Admin", adminSchema);
