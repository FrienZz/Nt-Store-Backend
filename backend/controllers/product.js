const path = require("path");
const fs = require("fs");
const Product = require("../models/product");
const Category = require("../models/category");
const logger = require("../utils/logger");
const { generateProductId } = require("../utils/generateId");
const calculatePackageStock = require("../utils/calculatePackageStock");

exports.getAllProducts = async (req, res) => {
  try {
    const { date, type } = req.query;
    const filter = { is_deleted: false };

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

    if (type) {
      filter.type = type;
    }

    const products = await Product.find(filter)
      .populate("categories", "category_type")
      .populate({
        path: "package_items.product",
        select: "product_id name img_url available_stock",
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "เรียกดูข้อมูลสินค้าสำเร็จ",
      data: products,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.getProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    let product = await Product.findOne({
      product_id: productId,
      is_deleted: false,
    })
      .populate("categories", "category_type")
      .populate({
        path: "package_items.product",
        select: "product_id name img_url available_stock",
      })
      .lean();

    if (product.type === "package" && product.package_items?.length) {
      product.package_stock = calculatePackageStock(product.package_items);
    }

    res.status(200).json({
      message: "เรียกดูข้อมูลสินค้าสำเร็จ",
      data: product,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { categories, type, package_items } = req.body;

    const validCategories = await Category.find({ _id: { $in: categories } });
    const categoriesArray = Array.isArray(categories)
      ? categories
      : [categories];
    if (validCategories.length !== categoriesArray.length) {
      logger.warn("เพิ่มข้อมูลสินค้าไม่สำเร็จ: หมวดหมู่บางรายการไม่ถูกต้อง");
      return res.status(404).json({ message: "หมวดหมู่บางรายการไม่ถูกต้อง" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "กรุณาอัปโหลดไฟล์",
      });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    let productData = {
      name: req.body.name,
      product_id: generateProductId(),
      description: req.body.description,
      img_url: fileUrl,
      price: req.body.price,
      discount_percent: req.body.discount_percent,
      type: type,
      categories: categoriesArray,
    };

    if (type === "single") {
      productData.total_stock = req.body.total_stock;
    } else if (type === "package") {
      if (!package_items || package_items.length === 0) {
        return res.status(400).json({
          message: "แพ็คเกจต้องมีสินค้าอย่างน้อย 1 รายการ",
        });
      }
      //covert json string to object js
      let parsedPackageItems = JSON.parse(req.body.package_items);

      if (!Array.isArray(parsedPackageItems)) {
        return res.status(400).json({
          message: "รูปแบบ package_items ไม่ถูกต้อง",
        });
      }
      const productIds = parsedPackageItems.map((item) => item.product);
      const existingProducts = await Product.find({
        _id: { $in: productIds },
        type: "single",
      });

      if (existingProducts.length !== productIds.length) {
        return res.status(400).json({
          message: "มีสินค้าในแพ็คเกจบางรายการไม่ถูกต้อง",
        });
      }

      productData.package_items = parsedPackageItems;
    }

    const product = new Product(productData);

    await product.save();
    logger.info(
      `เพิ่มข้อมูลสินค้าสำเร็จ: รหัสสินค้า=${product.product_id} ชื่อสินค้า=${product.name} โดยรหัสผู้ใช้งาน=${req.user.id}`,
    );
    res.status(201).json({
      message: "เพิ่มข้อมูลสินค้าสำเร็จ",
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดในการเพิ่มสินค้า: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.editProduct = async (req, res) => {
  const productId = req.params.id;
  const updateData = req.body;
  try {
    //ไม่อนุญาติให้แก้ไขประเภทของสินค้าได้
    if (updateData.type) {
      return res.status(400).json({
        message: "ไม่สามารถเปลี่ยนประเภทสินค้าได้",
      });
    }

    const product = await Product.findOne({
      product_id: productId,
      is_deleted: false,
    });

    if (!product) {
      logger.warn(
        `แก้ข้อมูลสินค้าไม่สำเร็จ: ไม่เจอรหัสสินค้า=${productId} นี้ในระบบ`,
      );
      return res.status(404).json({
        message: `ไม่เจอสินค้านี้ในระบบ`,
      });
    }

    if (updateData.total_stock) {
      if (product.type === "package") {
        return res.status(400).json({
          message: `สินค้าแพ็คเกจไม่สามารถแก้จำนวนสินค้าในสต๊อกได้`,
        });
      } else if (product.type === "single") {
        updateData.available_stock =
          updateData.total_stock -
          (product.total_stock - product.available_stock);
      }
    }

    if (req.file) {
      if (product.img_url) {
        const filename = path.basename(product.img_url);

        const oldPath = path.join(process.cwd(), "uploads", filename);

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      updateData.img_url = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
    }

    if (updateData.categories) {
      const category = await Category.find({
        _id: { $in: updateData.categories },
      });

      updateData.categories = Array.isArray(updateData.categories)
        ? updateData.categories
        : [updateData.categories];
      if (category.length !== updateData.categories.length) {
        logger.warn("แก้ข้อมูลสินค้าไม่สำเร็จ: หมวดหมู่บางรายการไม่ถูกต้อง");
        return res.status(404).json({
          message: `หมวดหมู่บางรายการไม่ถูกต้อง`,
        });
      }
    }

    if (updateData.package_items) {
      let parsedPackageItems = JSON.parse(updateData.package_items);
      if (product.type !== "package") {
        return res.status(400).json({
          message: "สินค้าแบบเดี่ยวไม่สามารถมีรายการแพ็คเกจได้",
        });
      }

      if (parsedPackageItems.length === 0) {
        return res.status(400).json({
          message: "แพ็คเกจต้องมีสินค้าอย่างน้อย 1 รายการ",
        });
      }

      const products = await Product.find({
        _id: {
          $in: parsedPackageItems.map((item) => item.product),
        },
        type: "single",
      });
      if (products.length !== parsedPackageItems.length) {
        return res.status(400).json({
          message: "มีสินค้าบางรายการไม่ถูกต้อง",
        });
      }
      updateData.package_items = parsedPackageItems;
    }

    const updateProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      { $set: updateData },
      { new: true },
    )
      .populate("categories", "category_type")
      .lean();
    logger.info(
      `อัพเดทข้อมูลสินค้าสำเร็จ: รหัสสินค้า=${product.product_id} ชื่อสินค้า=${product.name} โดยรหัสผู้ใช้งาน=${req.user.id}`,
    );
    res.status(201).json({
      message: "อัพเดทข้อมูลสินค้าสำเร็จ",
      update_data: updateProduct,
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดในการแก้ข้อมูลสินค้า: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.findOne({
      product_id: productId,
      is_deleted: false,
    });

    if (!product) {
      logger.warn(
        `ลบข้อมูลสินค้าไม่สำเร็จ: ไม่เจอรหัสสินค้า=${productId} นี้ในระบบ`,
      );
      return res.status(404).json({
        message: `ไม่เจอสินค้านี้ในระบบ`,
      });
    }

    const deleteProduct = await Product.findOneAndUpdate(
      {
        product_id: productId,
      },
      { $set: { is_deleted: true } },
      { new: true },
    );
    logger.info(
      `ลบข้อมูลสินค้าสำเร็จ: รหัสสินค้า=${product.product_id} ชื่อสินค้า=${product.name} โดยรหัสผู้ใช้งาน=${req.user.id}`,
    );
    res.status(200).json({
      message: "ลบข้อมูลสินค้าสำเร็จ",
      delete_data: deleteProduct,
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดในการลบข้อมูลสินค้า: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
};

exports.deletePackageItem = async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const packageData = await Product.findOne(
      {
        product_id: id,
        type: "package",
        "package_items.product": itemId,
        is_deleted: false,
      },
      {
        package_items: { $elemMatch: { product: itemId } },
      },
    )
      .populate(
        "package_items.product",
        "product_id name img_url price total_stock available_stock",
      )
      .lean();

    if (!packageData) {
      logger.warn(
        `ลบข้อมูลสินค้าไม่สำเร็จ: ไม่เจอรหัสสินค้าแพ็คเกจ=${id} หรือรหัสสินค้า=${itemId} นี้ในระบบ`,
      );
      return res.status(404).json({
        message: "ไม่พบสินค้านี้ในแพ็คเกจ",
      });
    }

    // packageData ที่ได้ยังเป็น array อยู่
    const removedItem = packageData.package_items[0];

    const result = await Product.updateOne(
      {
        product_id: id,
        $expr: { $gt: [{ $size: "$package_items" }, 1] }, //สินค้าในแพ็คเกจต้องมากกว่า 1
      },
      {
        $pull: { package_items: { product: itemId } },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        message: "ไม่สามารถลบสินค้าได้ (อาจเหลือชิ้นเดียว หรือไม่พบสินค้า)",
      });
    }

    logger.info(
      `ลบข้อมูลสินค้าในแพ็คเกจสำเร็จ: รหัสสินค้าแพ็คเกจ=${id} รหัสสินค้าที่ถูกลบ=${itemId} โดยรหัสผู้ใช้งาน=${req.user.id}`,
    );
    res.status(200).json({
      message: "ลบสินค้าออกจากแพ็คเกจสำเร็จ",
      delete_data: removedItem,
    });
  } catch (err) {
    logger.error(
      `เกิดข้อผิดพลาดในการลบข้อมูลสินค้าออกจากแพ็คเกจ: ${err.message}`,
    );
    res.status(400).json({
      message: err.message,
    });
  }
};
