const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

/**
 * 📌 API Đăng ký
 */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Kiểm tra email đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "Email đã được sử dụng" });

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword, isVerified: false });

    await user.save();

    // Tạo token xác thực email
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Kiểm tra biến môi trường
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ msg: "Lỗi cấu hình email" });
    }

    // Cấu hình SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Hệ thống" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Xác nhận tài khoản",
      html: `
        <h3>Chào ${name},</h3>
        <p>Nhấn vào link dưới đây để xác thực tài khoản:</p>
        <a href="http://192.168.88.89:5000/api/auth/verify?token=${encodeURIComponent(token)}">Xác thực tài khoản</a>
      `,
    };

    // Gửi email
    await transporter.sendMail(mailOptions);
    res.json({ msg: "Đăng ký thành công! Hãy kiểm tra email để xác thực tài khoản." });

  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi server");
  }
});

/**
 * 📌 API Xác nhận Email
 */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.redirect("http://192.168.88.89:5000/auth?verified=false&message=❌ Xác thực thất bại hoặc token đã hết hạn!");
    }

    // Cập nhật trạng thái xác thực
    user.isVerified = true;
    await user.save();

    // Thêm thông báo vào URL redirect
    res.redirect("http://192.168.88.89:5000/auth?verified=true&message=✅ Xác thực email thành công! Hãy đăng nhập.");

  } catch (error) {
    console.error(error);
    res.redirect("http://192.168.88.89:5000/auth?verified=false&message=❌ Xác thực thất bại hoặc token đã hết hạn!");
  }
});

/**
 * 📌 API Đăng nhập
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Email không tồn tại" });

    if (!user.isVerified) return res.status(400).json({ msg: "Email chưa được xác thực" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Mật khẩu không chính xác" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ msg: "Đăng nhập thành công!", redirect: "/dashboard.html", token });

  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi server");
  }
});

module.exports = router;