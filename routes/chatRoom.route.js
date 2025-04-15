const express = require('express')
const authMiddelware = require('../middlewares/authMiddleware')
const ChatRoomController = require('../controller/chatRoom.controller')

const router = express.Router();

//Tạo phòng chat
//Cung cấp 
//body : { chatRoomName <Có cũng dc ko cũng ko sao>, members< MẢNG Người tham gia có thể gồm người tạo hoặc ko
//  nhưng bắt buộc phải có người tham gia tại vì đã bắt lỗi thêm trùng và thiếu người>}
//token được gửi từ sau khi đăng nhập để trong phần header header: {Authorization: <token>
//Api cũng kiểm tra nếu thêm nhiêu đó người cùng id nếu đã tồn tại thì trả về phòng chat đã tạo trước đó
//Tạo thành công chatRoom mới thì người tạo nhận thông tin chatRoom từ việc gọi api còn 
//người đã thêm nhân từ socket
router.post('/',authMiddelware, ChatRoomController.create)

//Lấy tất cả phòng chat của người dùng
//Cung cấp:
//token được gửi từ sau khi đăng nhập để trong phần header header: {Authorization: <token>
//Trả về phòng chat và thông tin người có trong phòng
router.get('/',authMiddelware, ChatRoomController.getAll)

//Xóa phòng chat
//Cung cấp:
//params chatRoomId
//Người xóa nhận lại id của ChatRoom đã xóa
//người có trong chat Room nhận id từ socket
router.delete('/:chatRoomId',authMiddelware,ChatRoomController.delete)

//Tìm một phòng chat
//Cung cấp:
//params chatRoomId
//Người tìm nhân lại thong tin phòng đã tìm
router.get('/:chatRoomId', authMiddelware,ChatRoomController.getOne)



module.exports = router