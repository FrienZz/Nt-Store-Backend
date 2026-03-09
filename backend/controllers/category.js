const Category = require("./../models/category");
const logger = require("./../utils/logger");

exports.getAllCategories = async (req, res) => {
  try {
    const category = await Category.find({});

    res.status(200).json({
      message: "เรียกดูข้อมูลหมวดหมู่สำเร็จ",
      data: category,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const category = new Category({ category_type: req.body.category_type });
    await category.save();
    logger.info(
      `เพิ่มหมวดหมู่สำเร็จ: หมวดหมู่=${category.category_type} โดยรหัสผู้ใช้งาน=${req.user.id}`,
    );
    res.status(201).json({
      message: "เพิ่มข้อมูลหมวดหมู่สำเร็จ",
      data: category,
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
};
