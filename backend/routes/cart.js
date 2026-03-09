const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const cartController = require("../controllers/cart");

router.get("/me", authMiddleware, cartController.getMyCart);

router.post("/", authMiddleware, cartController.addCartItem);

router.patch("/product/:id", authMiddleware, cartController.editCartItem);

router.delete("/product/:id", authMiddleware, cartController.deleteCartItem);

module.exports = router;
