const User = require("../models/User");
const UserUtil = require("../utils/user-util");

const userController = {};

userController.requestFriend = async (req, res) => {
  try {
    const { userId } = req.body; //userId muốn kết bạn
    const userIdDaDangNhap = req.user._id; //user Id người gửi lời mời kết bạn

    const userNhanKetBan = await User.findById(userId.toString());

    const isFriend = userNhanKetBan.friends.some(
      (friends) => friends.toString() === userIdDaDangNhap.toString()
    );
    const isReqfriend = userNhanKetBan.requestfriends.some(
      (reqfriend) => reqfriend.userId.toString() === userIdDaDangNhap.toString()
    );

    if (isFriend) {//đã là bạn
      return res.status(200).json({ code: 3,  user: UserUtil.locUserRaIdNameAvatar(userNhanKetBan) }); 
    }

    if (isReqfriend) { // đã gửi lời mời
      return res.status(200).json({
        code: 2,
        user: UserUtil.locUserRaIdNameAvatar(userNhanKetBan),
      }); 
    } else {
      // Nếu là lời mời mới
      userNhanKetBan.requestfriends.push({
        userId: userIdDaDangNhap,
        text: req.body.text || "",
      });

      await userNhanKetBan.save();
      req.io
        .to(userNhanKetBan._id.toString())
        .emit("request-friend", { user: UserUtil.locUserRaIdNameAvatar(req.user) });
      return res.status(200).json({ code: 1 }); //lời mời mới
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json("Lỗi gửi yêu cầu kết bạn");
  }
};

userController.cancelResquestFriend = async (req, res) => {
    try{
        const { userId } = req.body; //userId muốn hủy kết bạn
        const userIdDaDangNhap = req.user._id; //user Id người hủy lời mời kết bạn

        const userNhanKetBan = await User.findById(userId);

        const daGuiLoiMoi = userNhanKetBan.requestfriends.some(
            (reqfriend) => reqfriend.userId.toString() === userIdDaDangNhap.toString()
          );

         if(!daGuiLoiMoi){
            console.log('Người dùng chưa gửi lời mời kết bạn')
            return res.status(404).json({msg : ['Người dùng chưa gửi lời mời kết bạn']})
         }
      const newReqFriend = userNhanKetBan.requestfriends.filter( reqfriends => 
        reqfriends.userId.toString() !== userIdDaDangNhap.toString()
      );
      userNhanKetBan.requestfriends = newReqFriend
      await userNhanKetBan.save();

      //Gửi thong6 tin người đã hủy lời mời kết bạn
      req.io.to(userNhanKetBan._id.toString())
      .emit("cancel-request-friend", { user: UserUtil.locUserRaIdNameAvatar(req.user) });
      return res.status(200).json({ msg: 'Đã hủy lời mời kết bạn' });

    }catch (err){
        console.log(err);
    return res.status(500).json("Lỗi hủy yêu cầu kết bạn");
    }
};
userController.responseFriend = async (req, res) => {
    try {
      const { code } = req.params; // 0: từ chối, 1: đồng ý
      const { userId } = req.body; // userId người gửi lời mời
      const userDaDangNhap = req.user;
  
      // Tìm user gửi lời mời
      const userGuiLoiMoiKb = await User.findById(userId);
      if (!userGuiLoiMoiKb) {
        return res.status(404).json({ msg: 'Không tìm thấy người gửi lời mời kết bạn' });
      }
  
      // Xoá lời mời kết bạn khỏi danh sách
      userDaDangNhap.requestfriends = userDaDangNhap.requestfriends.filter(
        (reqfriend) => reqfriend.userId.toString() !== userId.toString()
      );
  
      if (code.toString() === '0') {
        //  Trường hợp từ chối kết bạn
        await userDaDangNhap.save();
        return res.status(200).json({ msg: 'Đã từ chối lời mời kết bạn' });
      } else {
        //  Trường hợp đồng ý kết bạn
        // Tránh thêm trùng bạn
        if (!userDaDangNhap.friends.includes(userId.toString())) {
          userDaDangNhap.friends.push(userId);
        }
        if (!userGuiLoiMoiKb.friends.includes(userDaDangNhap._id.toString())) {
          userGuiLoiMoiKb.friends.push(userDaDangNhap._id);
        }
  
        await userDaDangNhap.save();
        await userGuiLoiMoiKb.save();
  
        // Gửi socket cho người gửi lời mời
        req.io.to(userId.toString()).emit(
          "agree-friend",
          UserUtil.locUserRaIdNameAvatar(userDaDangNhap)
        );

        req.io.to(userDaDangNhap._id.toString()).emit(
            "agree-friend",
            UserUtil.locUserRaIdNameAvatar(userGuiLoiMoiKb)
          );
    
  
        return res.status(200).json(UserUtil.locUserRaIdNameAvatar(userGuiLoiMoiKb));
      }
    } catch (err) {
      console.error(" Lỗi xử lý đồng ý/từ chối kết bạn:", err);
      return res.status(500).json({ msg: "Lỗi server khi xử lý kết bạn" });
    }
  };
  

module.exports = userController;
