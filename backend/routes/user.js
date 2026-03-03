const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const logger = require("./../utils/logger");
const User = require("./../db/user");
const Role = require("./../db/role");
const { hashPassword, comparePassword } = require("./../utils/hashPassword");
const authMiddleware = require("../middlewares/auth-middleware");
const allowRolesMiddleware = require("../middlewares/role-middleware");

router.get(
  "/",
  authMiddleware,
  allowRolesMiddleware("ผู้ดูแล"),
  async (req, res) => {
    try {
      const user = await User.find({})
        .select("-password")
        .populate("roleId", "role_type")
        .lean();

      const result = user.map(({ roleId, ...u }) => ({
        ...u,
        role_type: roleId.role_type,
      }));

      res.status(200).json({
        message: "เรียกดูข้อมูลผู้ใช้งานสำเร็จ",
        data: result ? result : [],
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

router.get("/me", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findOne({ _id: userId })
      .select("-password")
      .populate("roleId", "role_type")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "ไม่เจอผู้ใช้งานนี้ในระบบ",
      });
    }

    const { roleId, ...u } = user;
    const result = {
      ...u,
      role_type: roleId.role_type,
    };

    res.status(200).json({
      message: "เรียกดูข้อมูลผู้ใช้งานสำเร็จ",
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

router.get("/check-email", async (req, res) => {
  const email = req.query.email;

  try {
    const existingEmail = await User.findOne({ email: email });

    if (existingEmail) {
      return res.status(200).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
        available: false,
      });
    }
    res.status(200).json({
      message: "สามารถใช้อีเมลนี้ได้",
      available: true,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

router.get(
  "/:id",
  authMiddleware,
  allowRolesMiddleware("ผู้ดูแล"),
  async (req, res) => {
    const userId = req.params.id;

    try {
      const user = await User.findOne({ _id: userId })
        .select("-password")
        .populate("roleId", "role_type")
        .lean();

      if (!user) {
        return res.status(404).json({
          message: "ไม่เจอผู้ใช้งานนี้ในระบบ",
        });
      }

      const { roleId, ...u } = user;
      const result = {
        ...u,
        role_type: roleId.role_type,
      };

      res.status(200).json({
        message: "เรียกดูข้อมูลผู้ใช้งานสำเร็จ",
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  },
);

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      logger.warn(`เข้าสู่ระบบไม่สำเร็จ: ไม่พบอีเมลผู้ใช้งาน: ${email}`);
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      logger.warn(`เข้าสู่ระบบไม่สำเร็จ: รหัสผ่านไม่ถูกต้อง: ${email}`);
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const role = await Role.findById(user.roleId);

    const token = jwt.sign(
      {
        id: user._id,
        role_type: role.role_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    logger.info(`เข้าสู่ระบบสำเร็จ: รหัสผู้ใช้งาน=${user._id} อีเมล=${email}`);
    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token: token,
      role_type: role.role_type,
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดเข้าสู่ระบบ: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
});

router.post("/register", async (req, res) => {
  const hash = await hashPassword(req.body.password);
  try {
    const existingEmail = await User.findOne({ email: req.body.email });

    if (existingEmail) {
      logger.warn(
        `สมัครสมาชิกไม่สำเร็จ: อีเมล=${req.body.email} นี้ถูกใช้งานแล้ว`,
      );
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    const role = await Role.findOne({ role_type: "สมาชิก" });

    if (!role) {
      logger.error("เกิดข้อผิดพลาดสมัครสมาชิก: ไม่เจอบทบาทสมาชิกในระบบ");
      return res.status(404).json({
        message: "ไม่เจอบทบาทสมาชิกในระบบ",
      });
    }

    const user = new User({
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      password: hash,
      phone_number: req.body.phone_number,
      roleId: role._id,
    });

    await user.save();
    logger.info(
      `สมัครสมาชิกสำเร็จ: รหัสผู้ใช้งาน=${user._id} อีเมล=${req.body.email}`,
    );
    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ",
    });
  } catch (err) {
    logger.error(`เกิดข้อผิดพลาดสมัครสมาชิก: ${err.message}`);
    res.status(400).json({
      message: err.message,
    });
  }
});

/** 
router.patch("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = req.params.id;
  const updateData = req.body;
  let isModified = false;

  try {
    const targetUser = await User.findById(userId);

    if (targetUser.role === "ผู้ดูแล") {
      if (updateData.role === "ผู้ใช้งาน") {
        return res.status(403).json({
          message: "ไม่สามารถลดบทบาทของผู้ดูแลได้",
        });
      }
    }

    for (const key in updateData) {
      if (targetUser[key] !== updateData[key]) {
        isModified = true;
        break;
      }
    }

    if (!isModified) {
      return res.status(200).json({
        message: "อัพเดตข้อมูลสำเร็จ",
        update_data: targetUser,
      });
    }

    const updateUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "อัพเดตข้อมูลสำเร็จ",
      update_data: updateUser,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});
*/
module.exports = router;
