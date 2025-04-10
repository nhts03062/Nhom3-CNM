const express = require('express')
const authMiddelware = require('../middlewales/authMiddleware ')
const MessageController = require('../controller/message.controller')

const router = express.Router();

//Tạo tin nhắn mới
router.post('/',authMiddelware, MessageController.create)

//Lấy tất cả tin nhắn
router.get('/',authMiddelware, MessageController.getAll)

module.exports = router