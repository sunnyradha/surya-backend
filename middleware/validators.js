const { body } = require("express-validator");

const adminLoginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Email must be valid"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

const createOfficeValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Price must be a valid number"),
  body("rent")
    .notEmpty()
    .withMessage("Rent is required")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Rent must be a valid number"),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type is required")
    .bail()
    .isIn(["rent", "buy", "both"])
    .withMessage("Type must be one of: rent, buy, both"),
  body("amenities")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage("Amenities must be a string or string array"),
  body("existingImages")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage("existingImages must be a string or string array")
];

const updateOfficeValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a valid number"),
  body("rent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Rent must be a valid number"),
  body("type")
    .optional()
    .trim()
    .isIn(["rent", "buy", "both"])
    .withMessage("Type must be one of: rent, buy, both"),
  body("amenities")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage("Amenities must be a string or string array"),
  body("existingImages")
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === "string")
    .withMessage("existingImages must be a string or string array")
];

const enquiryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("officeId")
    .trim()
    .notEmpty()
    .withMessage("Office id is required")
    .bail()
    .isMongoId()
    .withMessage("Office id must be valid"),
  body("requestType")
    .optional()
    .trim()
    .isIn(["enquiry", "visit"])
    .withMessage("Request type must be enquiry or visit"),
  body("preferredDate")
    .optional()
    .isISO8601()
    .withMessage("Preferred date must be a valid date"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .bail()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be exactly 10 digits"),
  body("message")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Message cannot be empty")
];

const enquiryStatusValidation = [
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .bail()
    .isIn(["pending", "contacted"])
    .withMessage("Status must be pending or contacted")
];

module.exports = {
  adminLoginValidation,
  createOfficeValidation,
  updateOfficeValidation,
  enquiryValidation,
  enquiryStatusValidation
};
