const ChatRoom = require('../models/Chatroom')
const Message = require('../models/Message')

const messageController = {}

//Tạo một tin nhắn text
messageController.create = async(req,res) =>{
   try
   { const {chatId , content} = req.body

   if(! chatId){
        return res.status(400).json({msg: 'Thiếu chatRoom Id'})
   }
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
            return res.status(400).json({msg: 'Thiếu chatRoom Id'})
        }
        const messages = await Message.find({chatId}) // Chỉ nhận object key value nếu truyền vào chatId = value thoi nên ko dc
        .sort({ createdAt: 1}) //Sắp xếp từ tạo lâu nhất đến mới nhất tăng dần thời gian
        .populate('sendID', 'name email')

        if(!messages){
            return res.status(404).json({msg: `Lỗi ko tìm thấy phòng chat ${chatId}`})
        }

        return res.status(200).json(messages)
    }catch(err){
        console.log('Lỗi lấy tất cả tin nhắn', err)
        return res.status(500).json({msg: 'Lỗi lấy tất cả tin nhắn'})
    }
}

//Thu hồi tin nhắn cần cung cấp 
messageController.recall = async(req,res) =>{
    try{
        //id của message nhận từ client
        const {_id} = req.body
        const {code} = req.params
        //Nhận từ authorMiddleware
        const userRecallId = req.user._id 

        //Lấy thông tin message bằng _id của message đã lấy từ body và kiểm tra xem có thuộc về người gọi api này koko
        const messageBelongUserId = await Message.findById(_id).populate({
            path: 'chatId',
            populate: {path: 'members',select: 'name email' }
        })
        if(!messageBelongUserId){
            return res.status(400).json({msg : 'Tin nhắn này không tồn'})
        }
        //Kiểm tra ko thuộc về thì trả lỗi và kết thúc
        if(messageBelongUserId.sendID.toString() !== userRecallId.toString())
            return res.status(400).json({msg:'Tin nhắn không thuộc về người thu hồi'})
        
        //Kiểm tra xem đã thu hồi chưa
        if(messageBelongUserId.recall.toString() === '1' || messageBelongUserId.recall.toString()==='2'){
            return res.status(400).json({msg: 'Tin nhắn đã bị thu hồi trước đó'})
        }

        //code 1 là chỉ với người thu hồi còn 2 là tất cả coi như xóa nếu xóa thì thông báo tin nhắn đã thu hồi
        if(code.toString() === '1'){
            //Mặc định update không trả về document thêm {new:true} mới trả về doccument
            const recallMessage = await Message.findByIdAndUpdate(_id, {content: '' , recall:'1'}, {new: true})
            return res.status(200).json(recallMessage)
        }else {
            const recallMessage = await Message.findByIdAndUpdate(_id, {content: '' , recall:'2'}, {new: true})
            const members = messageBelongUserId.chatId.members
            members.forEach(mem => {
                if(mem._id.toString() !== userRecallId.toString())
                    req.io.to(mem._id.toString()).emit('recall',recallMessage)
            })
            return res.status(200).json(recallMessage)
        }

    }catch(err){
        console.log('Lỗi thu hồi tin nhắn',err)
        return res.status(500).json({msg: 'Lỗi thu hồi tin nhắn'})
    }

}




module.exports = messageController