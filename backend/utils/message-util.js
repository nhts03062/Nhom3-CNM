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
            if(userMemId._id.toString() !== userId.toString()){
                req.io.to(userMemId._id.toString()).emit('new-message', populatedMessage)
            }
        })
        }
        res.status(200).json(populatedMessage)
}


module.exports = messageUtil