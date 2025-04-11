const { io } = require("socket.io-client");

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

socketTest.on("disconnect", () => {
  console.log("Người dùng test đã ngắt kết nối");
});
