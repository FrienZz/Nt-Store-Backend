const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const bookSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
    },
    author: {
      type: String,
      required: [true, "Author is required."],
    },
    description: {
      type: String,
    },
    img_url: {
      type: String,
      required: [true, "Image URL is required."],
    },
    price_per_day: {
      type: Number,
      required: [true, "Price per day is required."],
    },
    total_copies: {
      type: Number,
      required: [true, "Total copies is required."],
    },
    available_copies: {
      type: Number,
      default: function () {
        return this.total_copies;
      },
    },
    discontinued: {
      type: Boolean,
      default: false,
    },
    publisherId: {
      type: Types.ObjectId,
      ref: "publishers",
    },
    categories: [{ type: Types.ObjectId, ref: "categories" }],
  },
  { timestamps: true },
);

const Book = mongoose.model("books", bookSchema);
module.exports = Book;
