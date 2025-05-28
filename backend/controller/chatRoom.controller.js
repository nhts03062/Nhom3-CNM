const ChatRoom = require("../models/Chatroom");
const User = require("../models/User");
const chatRoomUtil = require("../utils/chatRoom-util");
const Message = require( "../models/Message");

const chatRoomController = {};

//Tạo phòng chat
chatRoomController.create = async (req, res) => {
  try {
    const { chatRoomName, members, image } = req.body;

    const userCreateId = req.user._id;
    const uniqueMembers = [...new Set([...members, userCreateId.toString()])]; //Set là object mảng chứa những phần tử duy nhất {[a,b,c]}

    //Kiểm tra xem user có trong bảng user lưu trên mongodb
    const users = await User.find({ _id: { $in: uniqueMembers } });
    if (users.length !== uniqueMembers.length) {
      console.log("member:", members, "--uniqueMembers:", uniqueMembers);
      return res
        .status(400)
        .json({ msg: "Một hoặc nhiều người dùng không tồn tại" });
    }

    const isGroup = users.length > 2;

    if (!isGroup) {
      const chatRoom1 = await ChatRoom.findOne({
        //Kiểm tra xem mảng trong MOngo có chưa tất cả phần
        //  tử của members chưa ko để ý thứ tự nhưng nếu mảng mongo
        //  có nhiều phần tử hon mảng có thì vẫn nhận
        members: { $all: uniqueMembers },
        //Đảm bảo số lượng phần tử của mảng mongo bằng số lượng phần tử của members đưa vào
        $expr: { $eq: [{ $size: "$members" }, uniqueMembers.length] },
      });
      if (chatRoom1) return res.status(200).json(chatRoom1);

      const chatRoom = new ChatRoom({
        isGroupChat: isGroup,
        chatRoomName: chatRoomName ? chatRoomName : null,
        members: uniqueMembers,
      });
      const chatRoomSave = await chatRoom.save();

      try {
        const lastMessage = await chatRoomUtil.taoTinNhanCuoiCung(
          chatRoomSave._id,
          userCreateId,
          { type: "first", text: "" }
        );
        console.log("lastMessage", lastMessage);
        chatRoomSave.latestMessage = lastMessage._id;
        await chatRoomSave.save();
      } catch (err) {
        console.log("Lỗi khi tạo tin nhắn cuối cùng", err);
      }

      const populateChatRoom = await ChatRoom.findById(
        chatRoomSave._id
      ).populate("members", "name avatarUrl ");
      res.status(200).json(populateChatRoom);
    } else {
      const chatRoom = new ChatRoom({
        isGroupChat: isGroup,
        chatRoomName: chatRoomName,
        members: uniqueMembers,
        image: image
          ? image
          : "https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg",
        admin: userCreateId,
      });
      const chatRoomSave = await chatRoom.save();

      try {
        const lastMessage = await chatRoomUtil.taoTinNhanCuoiCung(
          chatRoomSave._id,
          userCreateId,
          { type: "first", text: "" }
        );
        console.log("lastMessage", lastMessage);
        chatRoomSave.latestMessage = lastMessage._id;
        await chatRoomSave.save();
      } catch (err) {
        console.log("Lỗi khi tạo tin nhắn cuối cùng", err);
      }
      
      const populateChatRoom = await ChatRoom.findById(chatRoomSave._id)
        .populate("members", "name avatarUrl ")
        .populate("admin", "name avatarUrl ");
      res.status(200).json(populateChatRoom);
    }
  } catch (err) {
    console.log("Lỗi tạo phòng", err);
    res.status(500).json({ msg: "Lõi tạo phòng chat" });
  }
};

//Lấy tất cả phòng chat của người dùng
chatRoomController.getAllChatRoomByUserId = async (req, res) => {
  try {
    const userId = req.user._id;

    const chatRooms = await ChatRoom.aggregate([
      {
        $match: { //Lọc các document trong collection dựa trên điều kiện
          members: userId,
        },
      },
      {
        $lookup: { //Kết hợp dữ liệu từ collection khác vào collection hiện tại
          from: "messages", // tên collection thật trong MongoDB muốn kết hợp vào
          localField: "latestMessage", //trường trong collection hiện tại dùng để so sánh 
          foreignField: "_id", //trường trong collection messages để so sánh 
          as: "latestMessage", // tên mảng kết quả được tạo ra
        },
      },
      {
        $unwind: { //Chuyển đổi mảng thành các document riêng biệt
          path: "$latestMessage", //trường mảng muốn chuyển đổi
          preserveNullAndEmptyArrays: true, //giữ nguyên các document không có giá trị
        },
      },
      {
        $sort: {
          "latestMessage.createdAt": -1, //Sắp xếp theo trường latestMessage theo thứ tự giảm dần
        },
      },
    ]);

    // Populate members sau khi aggregate
    await ChatRoom.populate(chatRooms, {
      path: "members",
      select: "name email avatarUrl",
    });

    for (const room of chatRooms) {
    const lastSeenArray = room.lastSeenAt || [];
    const lastSeenRecord = lastSeenArray.find(
      (item) => item.user.toString() === userId.toString()
    );
    const lastSeen = lastSeenRecord ? lastSeenRecord.lastSeen : new Date(0);

    const unreadCount = await Message.countDocuments({
      chatId: room._id,
      createdAt: { $gt: lastSeen }
    });

    room.unreadCount = unreadCount; // Thêm trường unreadCount vào object trả về 
  }

    res.status(200).json(chatRooms);
  } catch (err) {
    console.log("Lỗi khi lấy phòng:", err);
    res.status(500).json({ msg: "Lỗi khi tải phòng chat" });
  }
};

//Xóa phòng chat
chatRoomController.deleteByChatRoomId = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const chatRoom = await ChatRoom.findById(chatRoomId);

    if (!chatRoom) {
      return res
        .status(404)
        .json({ msg: `Lỗi không tìm thấy phòng chat: ${chatRoomId}` });
    }
    if (chatRoom.isGroupChat) {
      if (chatRoom.admin.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ msg: "Chỉ có admin mới có thể xoa phòng chat" });
      }
    }

    await ChatRoom.findByIdAndDelete(chatRoomId);
    return res.status(200).json({ msg: "phòng chat đã xóa" });
  } catch (err) {
    console.log("Lỗi khi xóa phòng", err);
    res.status(500).json({ msg: "Lỗi xóa phòng chat" });
  }
};

//Tìm một phòng chat
chatRoomController.getOneChatRoomById = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate("members", "name email avatarUrl")
      .exec();

    if (!chatRoom) {
      return res.status(404).json({ msg: "Không tìm thấy phòng chat" });
    }
    if (
      !chatRoom.members.some(
        (x) => x._id.toString() === req.user._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ msg: "Người dùng ko có quyền truy cập vào phòng chat" });
    }
    return res.status(200).json(chatRoom);
  } catch (err) {
    console.log("Lỗi xóa phòng chat", err);
    res.status(500).json({ msg: "Lỗi xóa phòng chat" });
  }
};

//Mời vào phòng chat
chatRoomController.inviteToGroupChat = async (req, res) => {
  try {
    const { userId, chatRoomId } = req.body; //userId của nguời cần mời vào
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ msg: "Không tìm thấy phòng chat" });
    }
    if (!chatRoom.members.includes(userId)) {
      chatRoom.members.push(userId);
      const chatRoomSave = await chatRoom.save();
      return res.status(200).json(chatRoomSave);
    } else {
      return res.status(400).json({ msg: "Người dùng đã có trong phòng chat" });
    }
  } catch (err) {
    console.log("Lỗi mời vào phòng chat", err);
    res.status(500).json({ msg: "Lỗi mời vào phòng chat" });
  }
};

//Mời nhiều người vào phòng chat
chatRoomController.inviteMultipleToGroupChat = async (req, res) => {
  try {
    const { userIds, chatRoomId } = req.body; //userIds của những người cần mời vào
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ msg: "Không tìm thấy phòng chat" });
    }
    const newMembers = userIds.filter(userId => !chatRoom.members.includes(userId));
    chatRoom.members.push(...newMembers);
    const chatRoomSave = await chatRoom.save();
    return res.status(200).json(chatRoomSave);
  } catch (err) {
    console.log("Lỗi mời vào phòng chat", err);
    res.status(500).json({ msg: "Lỗi mời vào phòng chat" });
  }
};

//Cập nhật phòng chat
chatRoomController.updateChatRoom = async (req, res) => {
  try {
    const { chatRoomId, chatRoomName, members, image, newAdminId } = req.body;
    console.log("body", req.body);

    const chatRoom = await ChatRoom.findById(chatRoomId);

    if (!chatRoom) {
      return res.status(404).json("Không tim thấy phòng chat");
    }
    if (chatRoom.admin.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ msg: "Chỉ người tạo phòng mới có quuyền cập nhật" });
    }
    chatRoom.chatRoomName = chatRoomName || chatRoom.chatRoomName;
    chatRoom.members = members || chatRoom.members;
    chatRoom.image = image || chatRoom.image;
    if (newAdminId) {
      chatRoom.admin = newAdminId;
    }

    const chatRoomSave = await chatRoom.save();
    const populateChatRoom = await ChatRoom.findById(chatRoomSave._id)
      .populate("members", "name avatarUrl ")
      .populate("admin", "name avatarUrl ");

    return res.status(200).json(populateChatRoom);
  } catch (err) {
    console.log("Lỗi update chat Room", err);
    res.status(500).json({ msg: "Lỗi update chat Room" });
  }
};
//Rời khỏi phòng chat
chatRoomController.leaveChatRoom = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json("Không tìm thấy phòng chat");
    }
    if (chatRoom.admin.toString() === req.user._id.toString()) {
      return res
        .status(403)
        .json({ msg: "Người tạo phòng không thể rời khỏi phòng" });
    }
    chatRoom.members = chatRoom.members.filter(
      (member) => member.toString() !== req.user._id.toString()
    );
    const chatRoomSave = await chatRoom.save();
    return res.status(200).json(chatRoomSave);
  } catch (err) {
    console.log("Lỗi rời khỏi phòng", err);
    res.status(500).json({ msg: "Lỗi rời khỏi phòng" });
  }
};
//Cập nhật trạng thái đã đọc
chatRoomController.updateLastSeen = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.user._id;

    const chatRoom = await ChatRoom
      .findById(chatRoomId)
      .populate("members", "name email avatarUrl");
    if (!chatRoom) {
      return res.status(404).json("Không tìm thấy phòng chat");
    }
    const lastSeen = chatRoom.lastSeenAt.find(
      (item) => item.user.toString() === userId.toString()
    );
    if (lastSeen) {
      lastSeen.lastSeen = Date.now();
    } else {
      chatRoom.lastSeenAt.push({ user: userId, lastSeen: Date.now() });
    }
    await chatRoom.save();
    return res.status(200).json(chatRoom);
  }
  catch (err) {
    console.log("Lỗi cập nhật trạng thái đã đọc", err);
    res.status(500).json({ msg: "Lỗi cập nhật trạng thái đã đọc" });
  }
}


module.exports = chatRoomController;
