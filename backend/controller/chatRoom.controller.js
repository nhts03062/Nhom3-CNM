const ChatRoom = require("../models/Chatroom");
const User = require("../models/User");

const chatRoomController = {};

//Tạo phòng chat
chatRoomController.create = async (req, res) => {
  try {
    const { chatRoomName, members } = req.body;
    
    const userCreateId = req.user._id 
    const uniqueMembers = [... new Set([... members, userCreateId])] //Set là object mảng chứa những phần tử duy nhất {[a,b,c]}

    const users = await User.find({ _id: { $in: uniqueMembers } });
    if (users.length !== uniqueMembers.length) {
      return res
        .status(400)
        .json({ msg: "Một hoặc nhiều người dùng không tồn tại" });
    }

    const chatRoom1 = await ChatRoom.findOne({
        //Kiểm tra xem mảng trong MOngo có chưa tất cả phần
        //  tử của members chưa ko để ý thứ tự nhưng nếu mảng mongo
        //  có nhiều phần tử hon mảng có thì vẫn nhận
      members: { $all: uniqueMembers }, 
      //Đảm bảo số lượng phần tử của mảng mongo bằng số lượng phần tử của members đưa vào 
      $expr: { $eq: [{ $size: "$members" }, uniqueMembers.length] },
    });
    if (chatRoom1) return res.status(200).json(chatRoom1);

    const isGroup = users.length > 2;

    const chatRoom = new ChatRoom({
      isGroup: isGroup,
      chatRoomName: chatRoomName ? chatRoomName : null,
      members: uniqueMembers,
    });

    await chatRoom.save();

    uniqueMembers.forEach((userId) => {
      if (userId.toString() !== userCreateId.toString())
        req.io.to(userId.toString()).emit("new-chatRoom", chatRoom);
    });

    res.status(200).json(chatRoom);
  } catch (err) {
    console.log('Lỗi tạo phòng', err);
    res.status(500).json({ msg: "Lõi tạo phòng chat" });
  }
};


//Lấy tất cả phòng chat của người dùng

chatRoomController.getAll = async (req, res) => {
  try {
    //Tim phong chat ma nguoi dung la thanh vienv
    const chatRooms = await ChatRoom.find({ members: req.user._id })
      .populate("members",  'name email') // điền đầy các trường bên trong nó mà là Object id trong members
      .exec(); // trả về proomise

    res.status(200).json(chatRooms);
  } catch (err) {
    console.log('Lỗi khi lấy tất cả phòng',err)
    res.status(500).json({ msg: "Lỗi khi tải phòng chat" });
  }
};

//Xóa phòng chat

chatRoomController.delete = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const chatRoom = await ChatRoom.findById(chatRoomId);

    if (!chatRoom) {
      return res
        .status(404)
        .json({ msg: `Lỗi không tìm thấy phòng chat: ${chatRoomId}` });
    }
    const members = chatRoom.members;

    await ChatRoom.findByIdAndDelete(chatRoomId);

    members.forEach((userId) => {
      if (userId.toString() !== req.user._id.toString())
      req.io.to(userId.toString()).emit("delete-chatRoom", chatRoomId);
    });

    res.status(200).json(chatRoomId);
  } catch (err) {
    console.log('Lỗi khi xóa phòng',err);
    res.status(500).json({ msg: "Lỗi xóa phòng chat" });
  }
};

//Tìm một phòng chat

chatRoomController.getOne = async(req, res) =>{
  try{
    const {chatRoomId} = await req.params;
    const chatRoom = await ChatRoom.findById(chatRoomId).populate('members', 'name email').exec();
    
    if(!chatRoom){
      return res.status(404).json({msg : 'Không tìm thấy phòng chat'})
    }
    if(!chatRoom.members.some(x => x._id.toString() === req.user._id.toString())){
      return res.status(403).json({msg: 'Người dùng ko có quyền truy cập vào phòng chat'})
    }
    return res.status(200).json(chatRoom)
  }catch(err){
    console.log('Lỗi xóa phòng chat', err)
    res.status(500).json({msg: 'Lỗi xóa phòng chat'})
  }
};


module.exports = chatRoomController;
