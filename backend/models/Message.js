const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    chatId: {type: mongoose.Schema.Types.ObjectId, ref: "Chatroom"},
    sendID: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    replyToMessage:{type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null},
    content:{type: String,require: true},
    recall: {type: String, default: '0'}
    // seen: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}]
}, { timestamps: true }); //Lưu thời gian tạo và cập nhật

module.exports = mongoose.model("Message", MessageSchema);
