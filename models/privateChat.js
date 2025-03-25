const mongoose = require("mongoose");

const privateChatSchema = mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const PrivateChat = mongoose.model("PrivateChat", privateChatSchema);

exports.PrivateChat = PrivateChat;
