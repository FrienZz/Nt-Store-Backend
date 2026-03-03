const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const publisherSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Publisher name is required."],
      unique: true,
    },
  },
  { timestamps: true }
);

const Publisher = mongoose.model("publishers", publisherSchema);
module.exports = Publisher;
