const mongoose = require("mongoose");

const ChatroomSchema = new mongoose.Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    chatRoomName: { type: String, required: false },
    members: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    image: {type: String, required: false },
    admin:{type: mongoose.Schema.ObjectId, ref: "User"},
    latestMessage: {type: mongoose.Schema.ObjectId, ref: "Message" },
    lastSeenAt: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lastSeen: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
); //Lưu thời gian tạo và cập nhật

module.exports = mongoose.model("Chatroom", ChatroomSchema);
