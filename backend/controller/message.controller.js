const ChatRoom = require('../models/Chatroom')
const Message = require('../models/Message')

const messageController = {}

//Tạo một tin nhắn text
messageController.create = async(req,res) =>{
   try
   { const {chatId , content} = req.body
    const userId = req.user._id // lấy tự middleware

    const message = new Message({
        chatId,
        sendID : userId,
        content
    })
    console.log(message)

    await message.save(); // message sẽ được cập nhật _id và create/update at


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
}catch(err){
    console.log(err)
    res.status(500).json('Lỗi tạo tin nhắn')
}
}


//Lấy tất cả tin nhắn

messageController.getAll = async(req, res) =>{
    try{
        const {chatId} = req.body
        if(!chatId){
            return res.status(400).json({msg: 'Thiếu chat Id'})
        }
        const messages = await Message.find({chatId}) // Chỉ nhận object key value nếu truyền vào chatId = value thoi nên ko dc
        .sort({ createdAt: 1}) //Sắp xếp từ tạo lâu nhất đến mới nhất tăng dần thời gian
        .populate('sendID', 'name email')
        return res.status(200).json(messages)
    }catch(err){
        console.log('Lỗi lấy tất cả tin nhắn', err)
        return res.status(500).json({msg: 'Lỗi lấy tất cả tin nhắn'})
    }
}




module.exports = messageController