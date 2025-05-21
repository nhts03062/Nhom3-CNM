// routes/friend.route.js
const express = require('express');
const router = express.Router();
const authMiddelware = require('../middlewales/authMiddleware ')
const UserController = require('../controller/user.controller')

//update thông tin người dùng
// cung cấp
//token
//body : {name, avatar, phone, address}
router.put('/updateuser', authMiddelware, UserController.updateUser)

//Lấy danh sách tất cả người dùng
// cung cấp
//token
router.get('/alluser', authMiddelware, UserController.getAllUser)

//lấy tất cả bạn bè
// cung cấp
//token
router.get('/allfriend', authMiddelware, UserController.getAllFriend)

//update thông tin người dùng
// cung cấp
//token
//body : {name, avatar, phone, address}
router.put('/updateuser', authMiddelware, UserController.updateUser)

//Lấy thông tin người dùng theo id
// cung cấp
//token
//params : {userId}
router.get('/:userId', authMiddelware, UserController.getUserById)

//Gửi lời mời kết bạn
// cung cấp
//token
//body : {userId} id người muốn kết bạn
router.post('/sendreqfriend', authMiddelware, UserController.sendRequestFriend)

//phản hồi kết bạn
// cung cấp
//token
//body : {userId} id gửi lời mời kết bạn // code 0 là ko đồng ý 1 là đồng ý
router.post('/resfriend/:code', authMiddelware, UserController.responseFriend)

//hủy kết bạn
// cung cấp
//token
//body : {friendId}
router.delete('/unfriend', authMiddelware, UserController.unFriend)

//hủy lời mời kết bạn
// cung cấp
//token
//body: {userId} //người muốn hủy kết bạn
router.post('/cancelreqfriend',authMiddelware, UserController.cancelResquestFriend)

//Đồng bộ danh bạ 
// cung cấp
//token
//body : {contacts} danh bạ người dùng(sdt định dạng cho giống phàn update để dễ sử dụng/// chứ ko cái 09*** cái +084 chịu))
router.patch('/synccontact', authMiddelware, UserController.synchronizeContacts)

//Đổi mật khẩu
// cung cấp
//token
//body : { oldPassword, newPassword }
router.post('/changepassword', authMiddelware, UserController.changePassword)


module.exports = router;