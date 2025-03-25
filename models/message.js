const mongoose = require("mongoose");
const TYPES = {
  TEXT: "text",
  FILE: "file",
};
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageType: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.messageType === TYPES.TEXT;
      },
    },
    uniqueFileName: {
      type: String,
      required: function () {
        return this.messageType === TYPES.FILE;
      },
    },
    originalFileName: {
      type: String,
      required: function () {
        return this.messageType === TYPES.FILE;
      },
    },

    chatType: {
      type: String,
      enum: ["private", "group"],
      required: true,
    },
    chatGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatGroup",
      required: function () {
        return this.chatType === "group";
      },
    },
    privateChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivateChat",
      required: function () {
        return this.chatType === "private";
      },
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

exports.Message = Message;
exports.TYPES = TYPES;
