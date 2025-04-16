const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Import model User

// Route tìm kiếm người dùng theo email
router.get('/', async (req, res) => {
  const email = req.query.email; // Lấy email từ query params
  try {
    const user = await User.findOne({ email: email }); // Tìm người dùng theo email
    if (!user) {
      return res.status(404).json({ message: 'User not found' }); // Nếu không tìm thấy người dùng
    }
    res.json({ user }); // Trả về thông tin người dùng
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' }); // Lỗi server
  }
});

module.exports = router;  // Export router để sử dụng trong server.js
