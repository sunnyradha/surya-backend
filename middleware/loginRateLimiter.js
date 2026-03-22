const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again in 1 minute."
  }
});

module.exports = loginRateLimiter;
