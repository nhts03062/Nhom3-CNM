const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
require("dotenv").config();

const app = express();

// Cấu hình middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
connectDB()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Thoát chương trình nếu kết nối thất bại
  });

// Sử dụng API đăng ký & đăng nhập
app.use("/api/auth", require("./routes/auth"));

// Cấu hình cổng và khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
