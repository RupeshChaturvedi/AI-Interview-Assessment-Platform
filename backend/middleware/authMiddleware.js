
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Attach logged-in user information
    req.user = {
      id: decoded.id || decoded.userId || decoded._id,
      ...decoded
    };

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid user information in token."
      });
    }

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Session expired. Please login again."
          : "Invalid authentication token."
    });
  }
};

module.exports = authMiddleware;
