const express = require('express')
const authMiddelware = require('../middlewales/authMiddleware ')
const MessageController = require('../controller/message.controller')

const router = express.Router();

//Tạo tin nhắn mới
//Cung cấp 
//body : {chatId: <chatRoomId> , content<Nội dung text>}
//token được gửi từ sau khi đăng nhập để trong phần header header: {Authorization: <token>
//Sau đó trả về cho tất cả ngừời trong phòng nội dung tin nhắn còn người tạo tin nhắn nhận về trong phần gọi api
router.post('/',authMiddelware, MessageController.create)

//Lấy tất cả tin nhắn
//Cung cấp
//body: {chatId: <ChatRoomId>}
//token được gửi từ sau khi đăng nhập để trong phần header header: {Authorization: <token>
//Trả về cho người dùng tất cả tin nhắn của phòng đó không phần trang
router.get('/',authMiddelware, MessageController.getAll)

//Thu hồi tin nhắn
// Endpoint: POST /api/message/recall/:code
// Body: { _id: <ID của tin nhắn> } 
//token được gửi từ sau khi đăng nhập để trong phần header header: {Authorization: <token>
// code:
// "1": chỉ người thu hồi không thấy nội dung nữa
// "2": toàn bộ thành viên trong phòng không thấy nữa(xóa tin nhắn)
// Sau khi gọi API:
// Server cập nhật trường content thành "" và thêm recall: '1' hoặc '2' vào message
//Nếu code === "1" thì api trả về json của message sau khi update
// Nếu code === "2", server sẽ gửi socket event "recall" đến các thành viên khác trong phòng
// if (message.recall === '1' && message.sendID === currentUser._id) {
//     // Tin nhắn bị thu hồi bởi chính người dùng → ẩn hoặc ghi chú
//     return <Text style={{ fontStyle: 'italic', color: 'gray' }}>Bạn đã thu hồi tin nhắn này</Text>
//   }
//   if (message.recall === '2') {
//     return <Text style={{ fontStyle: 'italic', color: 'gray' }}>Tin nhắn đã bị thu hồi</Text>
//   }
//Còn lại bắt sự kiện socket
  
router.get('/recall/:code',authMiddelware, MessageController.recall)

module.exports = router