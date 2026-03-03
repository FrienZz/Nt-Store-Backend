const jwt = require("jsonwebtoken");
const logger = require("./../utils/logger");
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.warn("ไม่มีสิทธิ์เข้าใช้งาน: ไม่มีโทเคน");
    return res.status(401).json({
      message: "ไม่มีโทเคน",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.error("โทเคนไม่ถูกต้อง");
    res.status(401).json({
      message: "โทเคนไม่ถูกต้อง",
    });
  }
};

module.exports = authMiddleware;
