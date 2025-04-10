const express = require('express')
const authMiddelware = require('../middlewales/authMiddleware ')
const ChatRoomController = require('../controller/chatRoom.controller')

const router = express.Router();

//Tạo phòng chat
router.post('/',authMiddelware, ChatRoomController.create)

//Lấy tất cả phòng chat của người dùng
router.get('/',authMiddelware, ChatRoomController.getAll)

//Xóa phòng chat
router.delete('/:chatRoomId',authMiddelware,ChatRoomController.delete)

//Tìm một phòng chat

router.get('/:chatRoomId', authMiddelware,ChatRoomController.getOne)



module.exports = router