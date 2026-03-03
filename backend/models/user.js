const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      required: [true, "Firstname is required."],
    },
    lastname: {
      type: String,
      required: [true, "Lastname is required."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 character."],
    },
    phone_number: {
      type: String,
      required: [true, "Phone number is required."],
    },
    /**
    role: {
      type: String,
      enum: ["ผู้ใช้งาน", "ผู้ดูแล"],
      default: "ผู้ใช้งาน",
    },
    */
    status: {
      type: String,
      enum: ["กำลังใช้งาน", "ปิดการใช้งาน"],
      default: "กำลังใช้งาน",
    },

    roleId: {
      type: Types.ObjectId,
      ref: "roles",
    },

    createdBy: {
      type: Types.ObjectId,
      ref: "users",
      immutable: true,
    },
    updatedBy: {
      type: Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("users", userSchema);
module.exports = User;
