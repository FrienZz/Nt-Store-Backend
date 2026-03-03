const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const Cart = require("../db/cart");
const Book = require("../db/book");

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate({
      path: "cart_items.book",
      select: "title img_url price_per_day available_copies",
    });

    if (!cart) {
      return res.status(200).json({
        message: "ยังไม่มีตะกร้าสินค้า",
        cart: {
          _id: null,
          userId: req.user.id,
          cart_items: [],
        },
      });
    }

    res.status(200).json({
      message: "แสดงรายการหนังสือในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { bookId, quantity, rental_duration } = req.body;

    if (quantity <= 0 || rental_duration <= 0) {
      return res
        .status(400)
        .json({ message: "จำนวนหนังสือหรือระยะเวลาที่ให้เช่าห้ามน้อยกว่า 1" });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ message: "ไม่พบข้อมูลของหนังสือ" });
    }

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        cart_items: [],
      });
    }

    const existingItem = cart.cart_items.find(
      (item) =>
        item.book.toString() === bookId &&
        item.rental_duration === rental_duration,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.cart_items.push({
        book: bookId,
        quantity: quantity,
        price_per_day: book.price_per_day,
        rental_duration: rental_duration,
      });
    }

    await cart.save();
    res.status(201).json({
      message: "เพิ่มหนังสือในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.patch("/product/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "ไม่เจอตะกร้าสินค้า" });
    }

    cart.cart_items.find((item) => item._id.toString() === id).quantity =
      quantity;

    await cart.save();
    res.status(200).json({
      message: "อัพเดตจำนวนหนังสือในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.delete("/product/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "ไม่เจอตะกร้าสินค้า" });
    }

    cart.cart_items = cart.cart_items.filter(
      (item) => item._id.toString() !== id,
    );

    await cart.save();
    res.status(200).json({
      message: "ลบรายการหนังสือในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;
