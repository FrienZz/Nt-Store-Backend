const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const cartSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "users",
    },
    cart_items: [
      {
        book: { type: Types.ObjectId, ref: "books" },
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
      },
    ],
  },

  { timestamps: true },
);

const Cart = mongoose.model("carts", cartSchema);
module.exports = Cart;
