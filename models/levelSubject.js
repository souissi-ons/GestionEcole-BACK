const mongoose = require("mongoose");
const Joi = require("joi");

const levelSubjectSchema = mongoose.Schema({
  subject: {
    type: mongoose.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  level: {
    type: mongoose.Types.ObjectId,
    ref: "Level",
    required: true,
  },
  hoursNumber: {
    type: Number,
    required: true,
  },
  coefficient: {
    type: Number,
    required: true,
  },
});

const LevelSubject = mongoose.model("LevelSubject", levelSubjectSchema);

function validateLevelSubject(subject) {
  const schema = Joi.object({
    subject: Joi.string().required(),
    level: Joi.string().required(),
    hoursNumber: Joi.number().required(),
    coefficient: Joi.number().required(),
  });
  return schema.validate(subject);
}

exports.LevelSubject = LevelSubject;
exports.validateLevelSubject = validateLevelSubject;
