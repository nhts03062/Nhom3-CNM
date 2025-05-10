const Message = require('../models/Message');

const chatRoomUtil = {};

chatRoomUtil.taoTinNhanCuoiCung = async (chatRoomId,sendID, content) => {
    try{
        const message = {
            chatId: chatRoomId,
            sendID,
            content: content
        }
        const newMessage = await Message.create(message)
        return newMessage
    }catch(err){
        console.log('Lỗi tạo tin nhắn cuối cùng', err);
        throw new Error('Lỗi tạo tin nhắn cuối cùng');
    }
}

module.exports = chatRoomUtil;