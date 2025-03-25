const mongoose = require("mongoose");
const Joi = require("joi");

const sessionSchema = mongoose.Schema({
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  teacher: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  day: {
    type: Number,
    required: true,
  },
  week: {
    type: String,
    required: true,
    enum: ["A", "B", "both"],
  },
  group: {
    type: String,
    required: true,
    enum: ["1", "2", "both"],
  },
  room: {
    type: mongoose.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  levelSubject: {
    type: mongoose.Types.ObjectId,
    ref: "LevelSubject",
    required: true,
  },
  classe: {
    type: mongoose.Types.ObjectId,
    ref: "Classe",
    required: true,
  },
  schoolYear: {
    type: mongoose.Types.ObjectId,
    ref: "SchoolYear",
    required: true,
  },
  color: {
    type: String,
  },
});

function validateSession(session) {
  const schema = Joi.object({
    startTime: Joi.number().required().min(8).max(17),
    endTime: Joi.number().required().min(9).max(18),
    room: Joi.string().required(),
    levelSubject: Joi.string().required(),
    classe: Joi.string().required(),
    day: Joi.number().required(),
    week: Joi.string().valid("A", "B", "both").required(),
    group: Joi.string().valid("1", "2", "both").required(),
    teacher: Joi.string().required(),
    color: Joi.string(),
  });
  return schema.validate(session);
}
const Session = mongoose.model("Session", sessionSchema);

exports.Session = Session;
exports.validateSession = validateSession;
