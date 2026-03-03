const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const orderSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "users",
    },
    orderNo: {
      type: String,
      required: true,
      unique: true,
    },
    order_items: [
      {
        bookId: { type: Types.ObjectId, ref: "books" },
        quantity: {
          type: Number,
          required: [true, "Quantity is required."],
          min: 1,
        },
        price_per_day: {
          type: Number,
          required: [true, "Price per day is required."],
        },
        rental_duration: {
          type: Number,
          required: [true, "Rental duration is required."],
          min: 1,
        },
        start_date: {
          type: Date,
          default: null,
        },
        due_date: {
          type: Date,
          default: null,
        },
        return_date: {
          type: Date,
          default: null,
        },
        item_status: {
          type: String,
          enum: ["รอยืนยัน", "กำลังเช่า", "คืนแล้ว"],
          default: "รอยืนยัน",
        },
      },
    ],
    total_price: {
      type: Number,
      required: [true, "Total price is required."],
    },
    order_status: {
      type: String,
      enum: ["รอยืนยัน", "กำลังเช่า", "คืนแล้ว"],
      default: "รอยืนยัน",
    },
  },

  { timestamps: true },
);

const Order = mongoose.model("orders", orderSchema);
module.exports = Order;
