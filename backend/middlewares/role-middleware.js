const logger = require("./../utils/logger");
const allowRolesMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_type)) {
      logger.warn(
        `ไม่มีสิทธิ์เข้าใช้งาน: รหัสผู้ใช้งาน=${req.user.id} บทบาท=${req.user.role_type}`,
      );
      return res.status(401).json({
        message: `คุณไม่ได้มีบทบาทเป็น${roles.join("หรือ")}`,
      });
    }
    next();
  };
};

module.exports = allowRolesMiddleware;
