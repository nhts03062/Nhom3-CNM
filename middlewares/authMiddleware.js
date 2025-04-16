const jwt = require('jsonwebtoken')
const User = require('../models/User')
require('dotenv').config()

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // 👈 lấy phần sau "Bearer"

    if (!token) {
      return res.status(401).json({ msg: 'Bạn cần đăng nhập' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: 'Người dùng không tồn tại' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ msg: 'Token không hợp lệ' });
  }
};

module.exports = authMiddleware;
