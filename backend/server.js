const express = require("express");
const cors = require("cors");
const http = require('http')
const connectDB = require("./db");
const { Server } = require('socket.io')
require("dotenv").config();
const path = require('path');



const socketAuthMiddleware = require('./middlewales/socketAuthMiddleware')
const chatRoomSocket = require('./sockets/chatRoom.socket');
const userSocket = require('./sockets/user.socket')
const ChatRoom = require('./models/Chatroom');
const User = require("./models/User");

const app = express();
const server = http.createServer(app) //Tạo sever http tử express để có thể xử lý API RESTREST(express) và socket.io

const io = new Server(server, {
  cors: {
    origin: "*", //cho phép mọi domain kết nối với socket(Cho phép tất cả frontend ở localhost hoặc nơi khác kết nối được WebSocket.)
    methods: ["GET", "POST"]
  }
})

// Cấu hình middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
connectDB()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Thoát chương trình nếu kết nối thất bại
  });

// Cấu hình file tĩnh
app.use(express.static(path.join(__dirname, 'public')));


//Chia sẻ io cho các route khác
app.set('io', io)
app.use((req, res, next) => {
  req.io = io;
  next()
})
// Sử dụng API đăng ký & đăng nhập
app.use("/api/auth", require("./routes/auth"));
//Sử dụng API chatRoom
app.use('/api/chatroom', require('./routes/chatRoom.route'))
//Sử dụng API cho message
app.use('/api/message', require('./routes/message.route'))
//Sử dụng API cho search
app.use('/api/search', require('./routes/search.route'))
//Sử dụng API cho user
app.use('/api/user', require('./routes/user.route'))
//Sử dụng API cho upload file
app.use('/api/upload', require('./routes/upload.route'))

// emit là gửi sự kiện với 2 tham số là tên sự kiện và giá trị gửi di
//on là nhận sử kiện  với 2 tham số là tên sự kiện và giá trị đã gửi(giá trị nhận được)
//join là tham gia vào phòng tham số cần là tên phòng
//to được dùng để chỉ phòng muốn tham gia tham số là tên phòng

//Mỗi khi một client kết nối tới server qua socket (WebSocket),
// server tự động phát hiện và gọi callback trong "connection". và disconnect cũng vậyvậy


let userOnline = []


io.on("connection", (socket) => {
  console.log('Đã có người tham gia phòng');
  // tham gia vao phòng chat riêng
  //tham gia vào phòng chat nhóm của người dùng
  socket.on("join", async (userId) => {
    socket.join(userId.toString()) //Tham gia vào phòng với tên là userId
    socket.user = userId //Lưu thông tin người dùng vào socket để sử dụng sau này
    console.log(`User ${socket.user} đã tham gia vào phòng riêng`) // Sửa đổi để sử dụng socket.user

    const chatRooms = await ChatRoom.find({ members: socket.user })
    chatRooms.forEach(chatRoomId => {
      socket.join(chatRoomId._id.toString())
      console.log(`${socket.user} Đã tham gia vào phòng chat ${chatRoomId._id} `)
    })
    
    await User.findByIdAndUpdate(socket.user, { online: true }) //Cập nhật trạng thái online cho người dùng
    socket.broadcast.emit('onlined', socket.user)

    const user = userOnline.find(user => user.userId === userId)
    if (user){
      user.socketId = socket.id
    }else{
      userOnline.push({ userId, socketId: socket.id });
    }
  })

    /**-----start------Call video----------- */
    socket.on('call-request', ({ caller, recipient }) => {
        console.log('Caller:', caller);
        console.log('Recipient:', recipient);
      
        const recipientSocket = userOnline.find(
            (user) => user.userId === recipient._id,
        );
        console.log('Recipient socket:', recipientSocket);
        if (recipientSocket) {
        
            io.to(recipientSocket.socketId).emit('call-received', { caller });
        }
    });

     socket.on('accept-call', ({ caller, recipient }) => {
        console.log('Accepted call from:', caller);
        console.log('Recipient:', recipient);

        const callerSocket = userOnline.find((user) => user.userId === caller._id);
        console.log('Caller socket:', callerSocket);
        if (callerSocket) {
         
            io.to(callerSocket.socketId).emit('call-accepted', {
                recipient,
                caller,
            });
        }
    });

        socket.on('reject-call', ({ caller, recipient }) => {
        console.log('Rejected call from:', caller);
        console.log('Recipient:', recipient);

        const callerSocket = users.find((user) => user.userId === caller._id);
        console.log('Caller socket:', callerSocket);
        if (callerSocket) {

            io.to(callerSocket.socketId).emit('call-rejected');
        }
    });
    socket.on('offer', (offer) => {
      socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
      socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
      socket.broadcast.emit('ice-candidate', candidate);
    });
    /**-----End------Call video----------- */

  /**-----start------reset password----------- */
// Khi frontend join vào phòng cá nhân
socket.on("join-reset-room", (roomId) => {
  socket.join(roomId);
});

// Khi xác thực thành công từ email HTML
socket.on("reset-password-verified", ({ roomId, userId }) => {
  console.log("✅ Reset verified:", roomId, userId);
  io.to(roomId).emit("reset-password-verified", userId); // Gửi userId cho client đang chờ
});

  /**----ende-------reset password------------- */
 

  /**---start----Phần bạn bè--------------- */
//Ý tưởng là những thứ như đồng ý kết bạn hay gửi kết bạn cần gửi id
//  của người nhận và truyền vào data(thông tin của người gửi để khi 
// lấy ra push vào mảng render luôn ko cần phải gọi route getUserbyId)

//còn những thứ như hủy yêu cầu kết bạn, từ chối làm bạn, hủy bạn bè chỉ cần friendID Và nhận về 
// id của thằng làm những thứ này sau đó trong fe sẽ filres để loại nó ra khỏi danh sách hiện lên thôi

//gửi yêu cầu kết bạn
  socket.on('send-friend-request', (friendId, data) => { //friendId chỉ có id của người muốn kết bạn
    console.log('Received friend request:', data);
    socket.broadcast.to(friendId.toString()).emit('received-friend-request', data); //data là thông tin người gửi sự kiện di nguyên cái user (object)
  });
    //hủy gửi kết bạn
    socket.on('cancel-reqFriend', (userId) => { //userId là chỉ có id người muốn hủy kết bạn
    socket.broadcast.to(userId).emit('reqFriend-canceled', socket.user); //data trả về là userId của người hủy kết bạn
    console.log(`User ${socket.user} đã hủy yêu cầu kết bạn với ${userId}`); 
    }) 
//đồng ý kết bạn
  socket.on('accept-friend-request', (friendId, data) => { //friendId chỉ có id của người muốn kết bạn, data là thông tin của người dùng gửi sự kiện di nguyên cái user
    console.log('Received friend request:', data);
    socket.broadcast.to(friendId.toString()).emit('accepted-friend-request', data);
  });
  //Nhận sự kiện từ chối yêu cầu kết bạn
  socket.on('reject-friend-request', (friendId) => { //friendId chỉ có id của người muốn kết bạn
    console.log('Received friend request:', friendId);
    socket.broadcast.to(friendId.toString()).emit('rejected-friend-request', socket.user);
  });
  //Nhận vào sự kiện cấp cho người mình muốn unfriend
  //phát sự kiện unfriend cho người dùng đó
  //Người dùng nhận sự kiện unfriend và hủy kết bạn với người đó
  socket.on('unfriend', (userId) => { //người gọi truyền vào userId muốn hủy kết bạn
    socket.broadcast.to(userId).emit('unfriended', socket.user); //gửi lại người dùng hủy kết bạn là user đã hủyhủy
    console.log(`User ${socket.user} đã hủy kết bạn với ${userId}`);
  })


 /**--------------Phòng chat--------------------*/ 
  //người dùng tự động tham gia vào phòng chat nhóm mới
  // sau dó phát sự kiện cho tất cả người dùng online room-chat-created 
  socket.on('create-chatRoom', (chatRoomId, data) => { //chatRoomId là id của phòng chat, data là object chatRoom
    socket.join(chatRoomId.toString())
    io.emit('roomChat-created', data)
  })
  //Người dùng nhận sự kiện roomChat-created và 
  //và kiểm tra xem trong member có người dùng đó ko
  //có thì gọi join-chatRoom để tham gia vào phòng chat nhóm mới
  socket.on('join-chatRoom', (chatRoomId) => {
    socket.join(chatRoomId);
    console.log(`User ${socket.user} đã tham gia vào phòng chat ${chatRoomId}`);
  });

//update là chỉ admin gọi đượcđược: kick thành viên, chỉnh sửa tên/ảnh nhóm
  socket.on('update-chatRoom', ({ chatRoomId, data }) => {  //chatRoomId là id của phòng chat, data là object chatRoom
    socket.broadcast.to(chatRoomId).emit('chatRoom-updated', data);
    console.log('cap65 nhay phong chat',data)
  })
  //delete là chỉ adimin gọi được: xóa phòng chat nhóm
  socket.on('delete-chatRoom', (chatRoomId) => { //chatRoomId là id của phòng chat
    socket.broadcast.to(chatRoomId).emit('chatRoom-deleted', chatRoomId);
  });
//Mời người dùng vào phòng chat: tất cả thành viên đều gọi được
  socket.on('invite-user', ({ chatRoomId, data }) => { //chatRoomId là id của phòng chat, data là object user
    socket.broadcast.to(chatRoomId).emit('user-invited', data);
  });
  //rời khỏi phòng chat nhóm và phát sự kiện user-left 
  // cho tất cả người dùng trong phòng chat nhóm đó và
  // giá trị trả về là id của user đã rời phòng chat
  socket.on('leave-chatRoom', (chatRoomId) => { //chatRoomId là id của phòng chat
    socket.leave(chatRoomId);
    console.log(`User ${socket.user} đã rời khỏi phòng chat ${chatRoomId}`);
    socket.broadcast.to(chatRoomId).emit('user-left', chatRoomId, socket.user); //Nhận về userid,chatRoomID đã rời phòng chat
  });
   /**--------------Phòng chat--------------------*/ 
   

  /**--------------Messages--------------------*/
  //emit create-message thì sever nhận
  //phát sự kiện message-created cho tất cả người dùng trong phòng chat nhóm đó
  socket.on('create-message', ({ chatRoomId, data }) => {
    console.log('create-message', data);
    const room = io.sockets.adapter.rooms.get(chatRoomId.toString());

    if (room) {
      console.log(`Phòng ${chatRoomId} tồn tại với ${room.size} client`);
      socket.broadcast.to(chatRoomId.toString()).emit('message-created', data);
      console.log(`Đã gửi tin nhắn tới phòng ${chatRoomId}`);
    } else {
      console.log(`Phòng ${chatRoomId} không tồn tại, không thể gửi tin nhắn`);
    }
  });

  socket.on('delete-message', ({ chatRoomId, data }) => { //chatRoomId là id của phòng chat, data là object message
    socket.broadcast.to(chatRoomId).emit('message-deleted', data);
  });
/**--------------Messages--------------------*/


  socket.on('disconnect', async () => {
    console.log('Người dùng đã ngắt kết nối')
    await User.findByIdAndUpdate(socket.user, { online: false }) //Cập nhật trạng thái online cho người dùng
    socket.broadcast.emit('offlined', socket.user) //Gửi lại cho người dùng đã ngắt kết nối
  })
})

// Cấu hình cổng và khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));

