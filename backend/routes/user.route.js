// routes/friend.route.js
const express = require('express');
const router = express.Router();
const authMiddelware = require('../middlewales/authMiddleware ')
const UserController = require('../controller/user.controller')

//Khi muốn kết bạn thì goị api này(/api/user/reqfriend)
//Cung cấp token từ headers và {userId: ..., text: .....} từ body người muốn kết bạn
//nếu đây là lời mời mới thì trả về {code : 1} và bên user nhẫn lời mời có sk socket "request-friend" với thông tin user gửi render ra đồng ý hoặc hủy kết bạn
// nếu đã gửi lời mời thì trả về object {code : 2 và object user  }
//nếu đẵ là bạn thì trả về {code :3 và object user}
//bên FE xử lý là gõ email vào ô tìm kiếm ấn nút sau đó gọi api /api/search/:email,nhận về thông tin của người muốn kết bạn
// render ra gửi lời mời nhấn gửi gọi /api/user/reqfriend truyền tt như đã nói ở trên nhận về và xử lý phần tiếp
//code 3 ko cần phải xử lý vì lúc tìm trả về danh sách bạn hoặc chờ đồng ý kết bạn của user đã tìm nên so sánh chỗ này 
router.post('/reqfriend',authMiddelware, UserController.requestFriend)
//Khi muốn hủy kết bạn thì gọi api : /api/usercancelreqfriend
//Cung cấp token từ headers và {userId : ....}
//nếu chưa mời mà gọi hủy thì trả về lỗi 404 và msg : Người dùng chưa gửi lời mời kết bạn
// thành công trả về res.status(200) bhen FE là res.ok nhớ vậy
//sau khi thành công bên người đã gửi lời mời kết bạn trước đó nhận được sk socket cancel-request-friend 
//với giá trị nhận được là {user : ...} gồm id,avatar, name 
//FE Cần bắt sk socket cancel-request-friend
//và const newReqFriend = userNhanKetBan.requestfriends.filter( reqfriends => 
// reqfriends.userId.toString() !== userIdDaDangNhap.toString());
//cho mảng mới ko có user đã hủy lời mời kết bạn
router.post('/cancelreqfriend',authMiddelware, UserController.cancelResquestFriend)

//Khi đồng ý hay từ chối  kết bạn thì goị api này 
//nhận code : 0 là ko đồng ý
//nhận code : 1 là đồng ý
//nhận token, body :{userId: }id người muốn hủy
router.post('/resfriend/:code',authMiddelware,UserController.responseFriend)

module.exports = router;