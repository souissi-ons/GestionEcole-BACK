const mongoose = require("mongoose");
const Joi = require("joi");

const subjectSchema = mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
});

function validateSubject(subject) {
  const schema = Joi.object({
    subjectName: Joi.string().required(),
    color: Joi.string().required(),
  });
  return schema.validate(subject);
}
const Subject = mongoose.model("Subject", subjectSchema);

exports.Subject = Subject;
exports.validateSubject = validateSubject;
