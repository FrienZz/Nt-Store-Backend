const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อสินค้า"],
    },
    product_id: {
      type: String,
      required: [true, "กรุณาระบุรหัสสินค้า"],
      unique: true,
    },
    description: {
      type: String,
    },
    img_url: {
      type: String,
      required: [true, "กรุณาอัปโหลดรูปภาพสินค้า"],
    },
    type: {
      type: String,
      enum: {
        values: ["single", "package"],
        message: "ประเภทสินค้าต้องเป็น single หรือ package เท่านั้น",
      },
      default: "single",
    },
    price: {
      type: Number,
      required: [true, "กรุณาระบุราคาสินค้า"],
      min: [0, "ราคาสินค้าต้องมากกว่าหรือเท่ากับ 0"],
    },
    discount_percent: {
      type: Number,
      min: [0, "ส่วนลดต้องไม่น้อยกว่า 0%"],
      max: [100, "ส่วนลดต้องไม่เกิน 100%"],
      default: 0,
    },
    total_stock: {
      type: Number,
      required: [
        function () {
          return this.type === "single";
        },
        "กรุณาระบุจำนวนสินค้าในสต๊อก",
      ],
      min: [0, "จำนวนสต๊อกต้องมากกว่าหรือเท่ากับ 0"],
    },
    available_stock: {
      type: Number,
      min: [0, "จำนวนสินค้าคงเหลือต้องมากกว่าหรือเท่ากับ 0"],
      default: function () {
        if (this.type === "single") {
          return this.total_stock;
        }
        return undefined;
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "สถานะต้องเป็น active หรือ inactive เท่านั้น",
      },
      default: "active",
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    categories: [
      {
        type: Types.ObjectId,
        ref: "categories",
        required: [true, "กรุณาเลือกหมวดหมู่สินค้า"],
      },
    ],
    package_items: {
      type: [
        {
          product: {
            type: Schema.Types.ObjectId,
            ref: "products",
            required: [true, "กรุณาเลือกสินค้าในแพ็คเกจ"],
          },
          quantity: {
            type: Number,
            required: [true, "กรุณาระบุจำนวนสินค้าในแพ็คเกจ"],
            min: [1, "จำนวนสินค้าในแพ็คเกจต้องมีอย่างน้อย 1 ชิ้น"],
          },
          _id: false,
        },
      ],
      default: undefined, // มีเฉพาะ type=package
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("products", productSchema);
module.exports = Product;
