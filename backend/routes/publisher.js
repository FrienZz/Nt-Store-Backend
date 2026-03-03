const express = require("express");
const router = express.Router();
const logger = require("./../utils/logger");
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const Publisher = require("./../db/publisher");

router.get(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
    try {
      const publisher = await Publisher.find({});

      res.status(200).json({
        message: "เรียกดูข้อมูลหมวดหมู่สำเร็จ",
        data: publisher,
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

router.post(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
    try {
      const publisher = new Publisher({ name: req.body.name });
      await publisher.save();
      logger.info(
        `เพิ่มสำนักพิมพ์สำเร็จ: สำนักพิมพ์=${publisher.name} โดยรหัสผู้ใช้งาน=${req.user.id}`,
      );
      res.status(201).json({
        message: "เพิ่มข้อมูลสำนักพิมพ์สำเร็จ",
        data: publisher,
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดในการเพิ่มสำนักพิมพ์: ${err.message}`);
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
