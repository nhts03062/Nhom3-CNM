const ChatRoom = require('../models/Chatroom');
const User = require('../models/User');
const Message = require('../models/Message');

module.exports = (io, socket) => { 
    const xuLyCallBack = (callback, status, msg, data = null) => {
        if (typeof callback === 'function') {
          callback({ status, msg, data });
        }
      };

    
      //Taọ message mới
      socket.on("create-message", async ({ chatId, content, logInUserId }, callback) => {
        try {
          const userId = socket.user._id;
          const message = await MessageUtil.saveMessageAndReturn(chatId, userId, content);
          io.to(chatId).emit("messages-created", message);
          callback({ status: 200, msg: "Tạo tin nhắn thành công" });
        } catch (err) {
          console.error(err);
          callback({ status: 500, msg: "Lỗi tạo tin nhắn" });
        }
      });
      
    

}