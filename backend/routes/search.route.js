const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Import model User
const authMiddelware = require('../middlewales/authMiddleware ')
const SearchController= require('../controller/search.controller')

// Route tìm kiếm người dùng theo email
//Cung câp email từ query nhận về thông tin của user đó
//túc là GET /api/user-by-email?email=abc@gmail.com
router.get('/userbyemail', authMiddelware,SearchController.getUserByEmail);

module.exports = router;  // Export router để sử dụng trong server.js