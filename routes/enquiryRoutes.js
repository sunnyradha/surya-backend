const express = require("express");

const { createEnquiry } = require("../controllers/enquiryController");
const enquiryRateLimiter = require("../middleware/enquiryRateLimiter");
const { validateRequest } = require("../middleware/validationMiddleware");
const { enquiryValidation } = require("../middleware/validators");

const router = express.Router();

router.post("/enquiry", enquiryRateLimiter, enquiryValidation, validateRequest, createEnquiry);

module.exports = router;
