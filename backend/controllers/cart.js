const Cart = require("../models/cart");
const Product = require("../models/product");
const calculatePackageStock = require("../utils/calculatePackageStock");

exports.getMyCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: "cart_items.product",
        select:
          "product_id name img_url price discount_percent available_stock type package_items",
        populate: {
          path: "package_items.product",
          model: "products",
          select: "product_id name img_url available_stock",
        },
      })
      .lean();

    if (!cart) {
      return res.status(200).json({
        message: "ยังไม่มีตะกร้าสินค้า",
        cart: {
          _id: null,
          user: req.user.id,
          cart_items: [],
        },
      });
    }

    cart.cart_items.forEach((item) => {
      const product = item.product;
      if (product.type === "package" && product.package_items?.length) {
        product.package_stock = calculatePackageStock(product.package_items);
      }
    });

    res.status(200).json({
      message: "แสดงรายการหนังสือในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.addCartItem = async (req, res) => {
  try {
    const { id, quantity } = req.body;

    if (quantity < 1) {
      return res
        .status(400)
        .json({ message: "จำนวนสินค้าต้องมีอย่างน้อย 1 ชิ้น" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบข้อมูลของสินค้า" });
    }

    const result = await Cart.updateOne(
      {
        user: req.user.id,
        "cart_items.product": id,
      },
      {
        $inc: { "cart_items.$.quantity": quantity },
      },
    );

    if (result.modifiedCount === 0) {
      await Cart.updateOne(
        { user: req.user.id },
        {
          $push: {
            cart_items: {
              product: id,
              quantity: quantity,
            },
          },
        },
        { upsert: true }, //สร้าง cart เมื่อยังไม่มี
      );
    }

    const cart = await Cart.findOne({ user: req.user.id });

    res.status(201).json({
      message: "เพิ่มสินค้าในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.editCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    if (quantity < 1) {
      return res
        .status(400)
        .json({ message: "จำนวนสินค้าต้องมีอย่างน้อย 1 ชิ้น" });
    }

    const result = await Cart.updateOne(
      {
        user: req.user.id,
        "cart_items.product": id,
      },
      {
        //set ค่าเมื่อ element ตัวแรกใน array match เงื่อนไข query
        $set: { "cart_items.$.quantity": quantity },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลของสินค้าในตะกร้า" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    res.status(200).json({
      message: "อัพเดตจำนวนสินค้าในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Cart.updateOne(
      { user: req.user.id, "cart_items.product": id },
      {
        //ลบ element ใน array ที่ match เงื่อนไขนี้ออกทั้งหมด
        $pull: {
          cart_items: { product: id },
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลของสินค้าในตะกร้า" });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    res.status(200).json({
      message: "ลบรายการสินค้าในตะกร้าสำเร็จ",
      cart: cart,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
