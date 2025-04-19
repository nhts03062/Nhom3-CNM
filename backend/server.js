const express = require("express");
const cors = require("cors");
const http = require('http') 
const connectDB = require("./db");
const {Server} = require('socket.io')
require("dotenv").config();

const app = express();
const server = http.createServer(app) //Tạo sever http tử express để có thể xử lý API RESTREST(express) và socket.io

const io = new Server(server, {
  cors:{
    origin: "*", //cho phép mọi domain kết nối với socket(Cho phép tất cả frontend ở localhost hoặc nơi khác kết nối được WebSocket.)
    methods: ["GET","POST"]
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



//Chia sẻ io cho các route khác
app.set('io',io)
app.use((req,res,next) =>{
  req.io = io;
  next()
})
// Sử dụng API đăng ký & đăng nhập
app.use("/api/auth", require("./routes/auth"));
//Sử dụng API chatRoom
app.use('/api/chatroom',require('./routes/chatRoom.route'))
//Sử dụng API cho message
app.use('/api/message', require('./routes/message.route'))

// emit là gửi sự kiện với 2 tham số là tên sự kiện và giá trị gửi di
//on là nhận sử kiện  với 2 tham số là tên sự kiện và giá trị đã gửi(giá trị nhận được)
//join là tham gia vào phòng tham số cần là tên phòng
//to được dùng để chỉ phòng muốn tham gia tham số là tên phòng

//Mỗi khi một client kết nối tới server qua socket (WebSocket),
// server tự động phát hiện và gọi callback trong "connection". và disconnect cũng vậyvậy
io.on("connection", (socket) =>{
  console.log('Đã có người tham gia phòng');

  socket.on("join", (userID)=>{
    socket.join(userID);
    console.log(`User ${userID} đã tham gia vào phòng riêng`)
  })

  socket.on('disconnect', () =>{
    console.log('Người dùng đã ngắt kết nối')
  })
})

// Cấu hình cổng và khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
