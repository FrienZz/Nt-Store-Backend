const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");
const Order = require("../db/order");
const Cart = require("../db/cart");
const generateOrderId = require("../utils/generateId");
const Book = require("../db/book");
const logger = require("./../utils/logger");

router.get(
  "/",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
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

      const order = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("userId", "firstname lastname phone_number")
        .populate({
          path: "order_items.bookId",
          select: "title img_url",
        })
        .lean();

      const mappedOrders = order.map((order) => {
        const { userId, ...restOrder } = order;

        return {
          ...restOrder,
          user: userId,
          order_items: order.order_items.map((item) => {
            const { bookId, ...restItem } = item;

            return {
              ...restItem,
              book: bookId,
            };
          }),
        };
      });

      res.status(200).json({
        message:
          date === "today"
            ? "เรียกดูข้อมูลคำสั่งซื้อวันนี้สำเร็จ"
            : "เรียกดูข้อมูลคำสั่งซื้อสำเร็จ",
        order: mappedOrders,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

router.get(
  "/rented-books",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
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

      const rentedBooks = await Order.aggregate([
        // filter วันนี้ (ถ้ามี)
        { $match: filter },
        // เอา order_items ออกมา
        { $unwind: "$order_items" },
        // เอาเฉพาะที่กำลังเช่า
        {
          $match: {
            "order_items.item_status": "กำลังเช่า",
          },
        },

        // รวมจำนวนหนังสือ
        {
          $group: {
            _id: "$order_items.bookId",
            totalQuantity: { $sum: "$order_items.quantity" },
          },
        },
        // ดึงข้อมูลหนังสือและหมวดหมู่
        {
          $lookup: {
            from: "books",
            localField: "_id",
            foreignField: "_id",
            as: "book",
          },
        },
        { $unwind: "$book" },
        {
          $lookup: {
            from: "publishers",
            localField: "book.publisherId",
            foreignField: "_id",
            as: "publisher",
          },
        },
        {
          $unwind: {
            path: "$publisher",
          },
        },

        {
          $project: {
            _id: 0, //ไม่เอา _id ในผลลัพธ์ออกมา
            book: {
              _id: "$book._id",
              title: "$book.title",
              img_url: "$book.img_url",
              author: "$book.author",
              publisher: {
                _id: "$publisher._id",
                name: "$publisher.name",
              },
              price_per_day: "$book.price_per_day",
            },
            quantity: "$totalQuantity",
          },
        },

        { $sort: { quantity: -1 } },
      ]);

      res.status(200).json({
        message: "เรียกดูข้อมูลหนังสือที่ถูกเช่าสำเร็จ",
        data: rentedBooks,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

router.get(
  "/rented-members",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
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

      const rentedMembers = await Order.aggregate([
        { $match: filter },

        { $unwind: "$order_items" },

        {
          $group: {
            _id: "$userId",
            rentingOrders: { $addToSet: "$_id" }, //เก็บ orderId แบบไม่ซ้ำ
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },

        {
          $project: {
            _id: 0,
            user: {
              _id: "$user._id",
              firstname: "$user.firstname",
              lastname: "$user.lastname",
            },
            totalOrders: { $size: "$rentingOrders" },
          },
        },
      ]);

      res.status(200).json({
        message: "เรียกดูข้อมูลรายชื่อผู้เช่าสำเร็จ",
        data: rentedMembers,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const order = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("userId", "firstname lastname phone_number")
      .populate({
        path: "order_items.bookId",
        select: "title img_url",
      })
      .lean();

    const mappedOrders = order.map((order) => {
      const { userId, ...restOrder } = order;

      return {
        ...restOrder,
        user: userId,
        order_items: order.order_items.map((item) => {
          const { bookId, ...restItem } = item;

          return {
            ...restItem,
            book: bookId,
          };
        }),
      };
    });

    res.status(200).json({
      message: "เรียกดูข้อมูลคำสั่งซื้อสำเร็จ",
      order: mappedOrders,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/:orderNo", authMiddleware, async (req, res) => {
  const { orderNo } = req.params;
  try {
    const order = await Order.findOne({ orderNo: orderNo })
      .populate("userId", "firstname lastname phone_number")
      .populate({
        path: "order_items.bookId",
        select: "title img_url",
      })
      .lean();

    const { userId, ...restOrder } = order;

    const mappedOrders = {
      ...restOrder,
      user: userId,
      order_items: order.order_items.map((item) => {
        const { bookId, ...restItem } = item;

        return {
          ...restItem,
          book: bookId,
        };
      }),
    };

    res.status(200).json({
      message: "เรียกดูข้อมูลคำสั่งซื้อสำเร็จ",
      order: mappedOrders,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "ไม่เจอตะกร้าสินค้า" });
    }

    let total_price = 0;
    const order_items = [];
    for (const item of cart.cart_items) {
      total_price += item.price_per_day * item.rental_duration * item.quantity;

      const book = await Book.findOneAndUpdate(
        {
          _id: item.book,
          available_copies: { $gte: item.quantity },
        },
        {
          $inc: { available_copies: -item.quantity },
        },
        { new: true },
      );

      if (!book) {
        return res.status(400).json({
          message: "ไม่พบหนังสือหรือจำนวนไม่เพียงพอ",
        });
      }

      order_items.push({
        bookId: item.book,
        quantity: item.quantity,
        price_per_day: item.price_per_day,
        rental_duration: item.rental_duration,
      });
    }

    const order = new Order({
      userId: req.user.id,
      orderNo: generateOrderId(),
      order_items: order_items,
      total_price: total_price,
    });

    await Cart.deleteOne({ userId: req.user.id });

    await order.save();
    logger.info(
      `เพิ่มคำสั่งซื้อสำเร็จ: รหัสผู้ใช้งาน=${req.user.id} รหัสคำสั่งซื้อ=${order.orderNo}`,
    );
    res.status(201).json({
      message: "เพิ่มคำสั่งซื้อสำเร็จ",
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ: ${err.message}`);
    res.status(500).json({
      message: err.message,
    });
  }
});

router.patch(
  "/return/:orderNo",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
    const { orderNo } = req.params;
    // รับค่า itemIds เป็น array ของรายการหนังสือที่ต้องการอัปเดตสถานะ
    const { itemIds } = req.body;

    try {
      const order = await Order.findOne({ orderNo: orderNo });

      if (!order) {
        return res.status(404).json({
          message: "ไม่พบคำสั่งซื้อในระบบ",
        });
      }
      const currentDate = new Date();
      for (const id of itemIds) {
        const item = order.order_items.id(id);
        if (!item) {
          return res.status(404).json({
            message: "ไม่พบรายการหนังสือในคำสั่งซื้อ",
          });
        }
        item.item_status = "คืนแล้ว";
        item.return_date = currentDate;

        const book = await Book.findOneAndUpdate(
          {
            _id: item.bookId,
            $expr: {
              $lte: [
                { $add: ["$available_copies", item.quantity] },
                "$total_copies",
              ],
            },
          },
          {
            $inc: { available_copies: item.quantity },
          },
          { new: true },
        );

        if (!book) {
          return res.status(400).json({
            message: "ไม่พบหนังสือหรือจำนวนเกินคลัง",
          });
        }
      }

      const allReturned = order.order_items.every(
        (item) => item.item_status === "คืนแล้ว",
      );
      if (allReturned) {
        order.order_status = "คืนแล้ว";
      }
      await order.save();
      logger.info(
        `คืนรายการหนังสือสำเร็จ: รหัสผู้ใช้งาน=${req.user.id} รหัสคำสั่งซื้อ=${order.orderNo} itemIds=[${itemIds.join(",")}]`,
      );
      res.status(201).json({
        message: "คืนรายการหนังสือสำเร็จ",
        update_order: order,
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดคืนหนังสือ: ${err.message}`);
      res.status(500).json({
        message: err.message,
      });
    }
  },
);

router.patch(
  "/confirm/:orderNo",
  authMiddleware,
  allowRolesMiddleware("พนักงานร้าน"),
  async (req, res) => {
    const { orderNo } = req.params;

    try {
      const order = await Order.findOne({ orderNo: orderNo });

      if (!order) {
        return res.status(404).json({
          message: "ไม่พบคำสั่งซื้อในระบบ",
        });
      }

      const startDate = new Date();
      for (const item of order.order_items) {
        const dueDate = new Date(startDate);
        dueDate.setDate(startDate.getDate() + item.rental_duration);
        item.start_date = startDate;
        item.due_date = dueDate;
        item.item_status = "กำลังเช่า";
      }

      order.order_status = "กำลังเช่า";
      await order.save();
      logger.info(
        `ยืนยันการเช่าหนังสือสำเร็จ: รหัสผู้ใช้งาน=${req.user.id} รหัสคำสั่งซื้อ=${order.orderNo}`,
      );
      res.status(201).json({
        message: "ยืนยันการเช่าหนังสือสำเร็จ",
        update_order: order,
      });
    } catch (err) {
      logger.error(`เกิดข้อผิดพลาดยืนยันการเช่า: ${err.message}`);
      res.status(500).json({
        message: err.message,
      });
    }
  },
);
module.exports = router;
