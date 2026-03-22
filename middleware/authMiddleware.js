const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const JWT_CONFIG = require("../config/jwt");

const sendAuthError = (res, message, code = "AUTH_ERROR") => {
  return res.status(401).json({
    success: false,
    code,
    message
  });
};

const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendAuthError(res, "Authentication token is required", "TOKEN_MISSING");
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        code: "AUTH_CONFIG_ERROR",
        message: "Authentication failed"
      });
    }

    const decoded = jwt.verify(token, jwtSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: ["HS256"]
    });

    if (decoded.role !== "admin") {
      return sendAuthError(res, "Invalid authentication token", "TOKEN_INVALID");
    }

    const adminExists = await Admin.exists({ _id: decoded.id });
    if (!adminExists) {
      return sendAuthError(res, "Invalid authentication token", "TOKEN_INVALID");
    }

    req.admin = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendAuthError(res, "Authentication token has expired", "TOKEN_EXPIRED");
    }

    if (error.name === "JsonWebTokenError") {
      return sendAuthError(res, "Invalid authentication token", "TOKEN_INVALID");
    }

    return sendAuthError(res, "Authentication failed", "AUTH_ERROR");
  }
};

module.exports = {
  protectAdmin
};
