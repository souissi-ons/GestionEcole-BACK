const mongoose = require("mongoose");
const Joi = require("joi");
const ROLES = {
  ADMIN: "Admin",
  MEMBER: "Membre",
};

const chatGroupSchema = mongoose.Schema({
  groupOwner: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  groupName: {
    type: String,
    required: true,
  },
  groupName: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  members: [
    {
      member: {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        required: true,
      },
    },
  ],

}, { timestamps: true });

const ChatGroup = mongoose.model("ChatGroup", chatGroupSchema);

exports.ChatGroup = ChatGroup;
exports.ROLES = ROLES;
