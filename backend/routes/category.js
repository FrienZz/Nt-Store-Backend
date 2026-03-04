const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const categoryController = require("../controllers/category");

router.get(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  categoryController.getAllCategories,
);

router.post(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  categoryController.addCategory,
);

module.exports = router;
