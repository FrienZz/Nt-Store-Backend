const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const userController = require("../controllers/user");

router.get(
  "/",
  authMiddleware,
  allowRolesMiddleware("ผู้ดูแล"),
  userController.getAllUsers,
);

router.get("/me", authMiddleware, userController.getMyProfile);

router.get("/check-email", userController.checkEmail);

router.get(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("ผู้ดูแล"),
  userController.getUser,
);

router.post("/login", userController.login);

router.post("/register", userController.register);

module.exports = router;
