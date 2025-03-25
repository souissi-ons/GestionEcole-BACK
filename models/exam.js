const mongoose = require("mongoose");
const Joi = require("joi");

const examSchema = mongoose.Schema({
  subject: {
    type: mongoose.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  exam: {
    type: String,
    required: true,
  },
  coefficient: {
    type: Number,
    required: true,
  },
});

function validateExam(exam) {
  const schema = Joi.object({
    subject: Joi.string().required(),
    exam: Joi.string().required(),
    coefficient: Joi.number().required(),
  });
  return schema.validate(exam);
}
const Exam = mongoose.model("Exam", examSchema);

exports.Exam = Exam;
exports.validateExam = validateExam;
