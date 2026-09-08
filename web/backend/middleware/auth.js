// FILE: middleware/auth.js
const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate JWT tokens in HTTP requests
 * Expects 'Authorization: Bearer <token>' header
 * Attaches decoded user info to req.user
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_curevirtual_2026";
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error("Token verification failed in auth.js:", err.message);
    res.status(401).json({
      success: false,
      message: "Invalid token.",
      isExpired: err.name === "TokenExpiredError"
    });
  }
}

module.exports = { authenticateToken };
