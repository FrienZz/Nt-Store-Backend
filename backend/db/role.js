const mongoose = require("mongoose");
const { Schema } = mongoose;

const roleSchema = new Schema(
  {
    role_type: {
      type: String,
      required: [true, "Role is required."],
      unique: true,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("roles", roleSchema);
module.exports = Role;
