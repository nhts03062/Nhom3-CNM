const Message = require('../models/Message')

const messageUtil = {}

messageUtil.saveMessageAndReturn = async (chatId, userId, content, req, res) =>{
     const message = new Message({
            chatId,
            sendID : userId,
            content
        })
    
        await message.save(); // message sẽ được cập nhật _id và create/update at
        //Ko thể const message = await message.save dc vì nó trả về document nên ko populate dc
    
        const populatedMessage = 
        await Message.findById(message._id).
        populate({
            path: 'chatId',
            populate: {path: 'members',select: 'name email' }
        }).
        populate('sendID', 'name email') //Tham số thứ 2 chọn trường muốn poppulate
        const chatRoom = populatedMessage.chatId
    
        if(chatRoom){
    
        chatRoom.members.forEach( userMemId =>{
            //Vì đã populate members nên h nó là mảng object User
                req.io.to(userMemId._id.toString()).emit('new-message', populatedMessage)
        })
        }
        res.status(200).json(populatedMessage)
}

messageUtil.saveMessageAndReturnSocket = async (chatId, userId, content, socket) => {
    try {
      // Tạo một tin nhắn mới
      const message = new Message({
        chatId,
        sendID: userId,
        content
      });
  
      await message.save(); // Lưu tin nhắn vào DB
  
      // Tìm và populate các thông tin cần thiết của tin nhắn
      const populatedMessage = await Message.findById(message._id)
        .populate({
          path: 'chatId',
          populate: { path: 'members', select: 'name email' } // Populat thành viên trong chatRoom
        })
        .populate('sendID', 'name email'); // Populat thông tin người gửi
  
      const chatRoom = populatedMessage.chatId;
  
      // Nếu có phòng chat
      if (chatRoom) {
        chatRoom.members.forEach(userMemId => {
          // Gửi tin nhắn mới tới các thành viên trong phòng chat qua socket
          socket.to(userMemId._id.toString()).emit('new-message', populatedMessage);
        });
      }
  
      // Trả về thông tin tin nhắn cho client gửi yêu cầu
      return populatedMessage;
    } catch (err) {
      console.error('Lỗi lưu tin nhắn và gửi thông báo:', err);
      throw new Error('Có lỗi xảy ra khi lưu tin nhắn');
    }
  };
  


module.exports = messageUtil