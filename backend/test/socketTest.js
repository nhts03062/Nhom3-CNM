const { io } = require("socket.io-client");
const { requestFriend } = require("../controller/user.controller");

//Chạy test bằng:  node socketTest.js phải cd tới test
const UserIdTest = "67f70dd5dff3a024ca4be7ba";

const socketTest = io("http://localhost:5000");

socketTest.on("connect", () => {
  console.log("Người dùng test đã kết nối");
  socketTest.emit("join", UserIdTest);
});

//Bắt sự kiện new-chatRomm
socketTest.on("new-chatRoom", (chatRoom) => {
  console.log("Người dùng test đã được thêm vào phòng chat", chatRoom);
});

//Bắt sự kiện delete-chatRoom
socketTest.on("delete-chatRoom", (chatRoom) => {
  console.log(`Đã xóa phòng chat ${chatRoom}`);
});

//Bắt sự kiện tạo new-chat
socketTest.on("new-message", (message) =>{
  console.log('Tin nhắn tới: ', message)
})

//Sự kiện thu hồi từ người tạo chat
socketTest.on("recall",(recallMessage) =>{
  console.log('Đã thu hồi tin nhắn:', recallMessage)
} )

//Sự kiện gửi lời mời kết bạn
socketTest.on("request-friend",(user) =>{
  console.log('Đã nhận lời mời kết bạn của user : ',user )
} )

//Sự kiện hủy lời mời kết bạn
socketTest.on("cancel-request-friend",(user) =>{
  console.log('Người dùng đã hủy lời mời kết bạn : ',user )
} )

//Sự kiện đồng ý lời mời kết bạn
socketTest.on("agree-friend",(user) =>{
  console.log('người dùng đã đồng ý kết bạn : ',user )
} )


socketTest.on("disconnect", () => {
  console.log("Người dùng test đã ngắt kết nối");
});
