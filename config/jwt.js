const JWT_CONFIG = {
  expiresIn: "1d",
  issuer: process.env.JWT_ISSUER || "ssa-backend",
  audience: process.env.JWT_AUDIENCE || "ssa-admin"
};

module.exports = JWT_CONFIG;
