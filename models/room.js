const mongoose = require("mongoose");
const Joi = require("joi");

const roomSchema = mongoose.Schema({
  roomName: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
});

const Room = mongoose.model("Room", roomSchema);

exports.Room = Room;
