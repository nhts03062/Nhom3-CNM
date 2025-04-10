const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    chatId: {type: mongoose.Schema.Types.ObjectId, ref: "Chatroom"},
    sendID: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    content:{type: String,require: true},
    // seen: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}]
}, { timestamps: true }); //Lưu thời gian tạo và cập nhật

module.exports = mongoose.model("Message", MessageSchema);
