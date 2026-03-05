const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const cartSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "users",
      required: [true, "ไม่พบข้อมูลผู้ใช้งาน"],
    },
    cart_items: [
      {
        product: {
          type: Types.ObjectId,
          ref: "products",
          required: [true, "ไม่พบข้อมูลสินค้า"],
        },
        quantity: {
          type: Number,
          required: [true, "กรุณาระบุจำนวนสินค้า"],
          min: [1, "จำนวนสินค้าต้องมีอย่างน้อย 1 ชิ้น"],
        },
      },
    ],
  },

  { timestamps: true },
);

const Cart = mongoose.model("carts", cartSchema);
module.exports = Cart;
