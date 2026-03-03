const express = require("express");
const upload = require("../utils/multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const Book = require("../models/product");
const Publisher = require("../models/publisher");
const Category = require("../models/category");
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const logger = require("../utils/logger");

router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};

    if (date === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      filter.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const book = await Book.find(filter)
      .populate("publisherId", "name")
      .populate("categories", "category_type")
      .lean();

    const mappedBooks = book.map(({ publisherId, ...rest_data }) => ({
      ...rest_data,
      publisher: publisherId,
    }));

    res.status(200).json({
      message: "เรียกดูข้อมูลหนังสือสำเร็จ",
      data: mappedBooks,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  const bookId = req.params.id;
  try {
    const book = await Book.findOne({ _id: bookId })
      .populate("publisherId", "name")
      .populate("categories", "category_type")
      .lean();

    if (!book) {
      return res.status(404).json({
        message: "ไม่เจอหนังสือที่ระบุในระบบ",
      });
    }

    const { publisherId, ...rest_data } = book;

    res.status(200).json({
      message: "เรียกดูข้อมูลหนังสือสำเร็จ",
      data: {
        ...rest_data,
        publisher: publisherId,
      },
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

router.post(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  upload.single("file"),
  async (req, res) => {
    try {
      const { categories, publisherId } = req.body;

      const publisher = await Publisher.findOne({ _id: publisherId });
      if (!publisher) {
        logger.error(
          `เพิ่มข้อมูลหนังสือไม่สำเร็จ: ไม่เจอรหัสสำนักพิมพ์=${publisherId} นี้ในระบบ`,
        );
        return res.status(404).json({
          message: "ไม่เจอสำนักพิมพ์ที่ระบุ",
        });
      }

      const validCategories = await Category.find({ _id: { $in: categories } });
      const categoriesArray = Array.isArray(categories)
        ? categories
        : [categories];
      if (validCategories.length !== categoriesArray.length) {
        logger.error(
          "เพิ่มข้อมูลหนังสือไม่สำเร็จ: ไม่เจอหมวดหมู่บางรายการในระบบ",
        );
        return res
          .status(404)
          .json({ message: "ไม่เจอหมวดหมู่บางรายการในระบบ" });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "กรุณาอัปโหลดไฟล์",
        });
      }
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;

      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,
        img_url: fileUrl,
        price_per_day: req.body.price_per_day,
        total_copies: req.body.total_copies,
        publisherId: publisher._id,
        categories: categories,
      });

      await book.save();
      logger.info(
        `เพิ่มข้อมูลหนังสือสำเร็จ: รหัสหนังสือ=${book._id} ชื่อหนังสือ=${book.title} โดยรหัสผู้ใช้งาน=${req.user.id}`,
      );
      res.status(201).json({
        message: "เพิ่มข้อมูลหนังสือสำเร็จ",
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดในการเพิ่มหนังสือ: ${err.message}`);
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

router.patch(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  upload.single("file"),
  async (req, res) => {
    const bookId = req.params.id;
    const updateData = req.body;
    try {
      const book = await Book.findById(bookId);

      if (!book) {
        logger.error(
          `แก้ข้อมูลหนังสือไม่สำเร็จ: ไม่เจอรหัสหนังสือ=${bookId} นี้ในระบบ`,
        );
        return res.status(404).json({
          message: `ไม่เจอหนังสือเล่มนี้ในระบบ`,
        });
      }

      if (req.file) {
        if (book.img_url) {
          const filename = path.basename(book.img_url);

          const oldPath = path.join(process.cwd(), "uploads", filename);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        updateData.img_url = `${req.protocol}://${req.get("host")}/uploads/${
          req.file.filename
        }`;
      }

      const category = await Category.find({
        _id: { $in: updateData.categories },
      });

      updateData.categories = Array.isArray(updateData.categories)
        ? updateData.categories
        : [updateData.categories];
      if (category.length !== updateData.categories.length) {
        logger.error(
          "แก้ข้อมูลหนังสือไม่สำเร็จ: ไม่เจอหมวดหมู่บางรายการในระบบ",
        );
        return res.status(404).json({
          message: `ไม่เจอหมวดหมู่บางรายการในระบบ`,
        });
      }

      updateData.available_copies =
        updateData.total_copies - (book.total_copies - book.available_copies);

      const publisher = await Publisher.findOne({
        _id: updateData.publisherId,
      });

      if (!publisher) {
        logger.error(
          `แก้ข้อมูลหนังสือไม่สำเร็จ: ไม่เจอรหัสสำนักพิมพ์=${updateData.publisherId} นี้ในระบบ`,
        );
        return res.status(404).json({
          message: `ไม่เจอสำนักตีพิมพ์ในระบบ`,
        });
      }

      const updateBook = await Book.findByIdAndUpdate(
        bookId,
        { $set: updateData },
        { new: true },
      )
        .populate("publisherId", "name")
        .populate("categories", "category_type")
        .lean();
      logger.info(
        `อัพเดทข้อมูลหนังสือสำเร็จ: รหัสหนังสือ=${book._id} ชื่อหนังสือ=${book.title} โดยรหัสผู้ใช้งาน=${req.user.id}`,
      );
      res.status(201).json({
        message: "อัพเดทข้อมูลหนังสือสำเร็จ",
        update_data: updateBook,
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดในการแก้ข้อมูลหนังสือ: ${err.message}`);
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

router.delete(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
    const bookId = req.params.id;
    try {
      const book = await Book.findById(bookId);

      if (!book) {
        logger.error(
          `ลบข้อมูลหนังสือไม่สำเร็จ: ไม่เจอรหัสหนังสือ=${bookId} นี้ในระบบ`,
        );
        return res.status(404).json({
          message: `ไม่เจอหนังสือเล่มนี้ในระบบ`,
        });
      }
      if (book.img_url) {
        const filename = path.basename(book.img_url);
        const oldPath = path.join(process.cwd(), "uploads", filename);

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const deleteBook = await Book.findByIdAndDelete(bookId);
      logger.info(
        `ลบข้อมูลหนังสือสำเร็จ: รหัสหนังสือ=${book._id} ชื่อหนังสือ=${book.title} โดยรหัสผู้ใช้งาน=${req.user.id}`,
      );
      res.status(200).json({
        message: "ลบข้อมูลหนังสือสำเร็จ",
        delete_data: deleteBook,
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดในการลบข้อมูลหนังสือ: ${err.message}`);
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

module.exports = router;
