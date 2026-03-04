const express = require("express");
const upload = require("../utils/multer");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const productController = require("../controllers/product");

router.get("/", productController.getAllProducts);

router.get("/:id", productController.getProduct);

router.post(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  upload.single("file"),
  productController.addProduct,
);

router.patch(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  upload.single("file"),
  productController.editProduct,
);

router.delete(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  productController.deleteProduct,
);

module.exports = router;
