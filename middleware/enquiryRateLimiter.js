const rateLimit = require("express-rate-limit");

const enquiryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many enquiry requests. Please try again in 1 minute."
  }
});

module.exports = enquiryRateLimiter;
