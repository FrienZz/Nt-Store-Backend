const express = require("express");
const router = express.Router();
const Role = require("../models/role");
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");

router.post(
  "/",
  authMiddleware,
  allowRolesMiddleware("ผู้ดูแล"),
  async (req, res) => {
    try {
      const role = new Role({ role_type: req.body.role_type });
      await role.save();
      res.status(201).json({
        message: "เพิ่มข้อมูลบทบาทสำเร็จ",
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
