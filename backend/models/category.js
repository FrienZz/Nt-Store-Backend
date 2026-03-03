const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const categorySchema = new Schema(
  {
    category_type: {
      type: String,
      required: [true, "Category is required."],
      unique: true,
    },
  },

  { timestamps: true },
);

const Category = mongoose.model("categories", categorySchema);
module.exports = Category;
