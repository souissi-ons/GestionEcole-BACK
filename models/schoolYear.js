const mongoose = require("mongoose");
const Joi = require("joi");

const schoolYearSchema = mongoose.Schema({
  schoolYear: {
    type: String,
    required: true,
  },
  current: {
    type: Boolean,
    required: true,
    default: false,
  },
});

function validateSchoolYear(subject) {
  const schema = Joi.object({
    schoolYear: Joi.string()
      .required()
      .regex(/^\d{4}-\d{4}$/),
    keepSubjects: Joi.bool,
  });
  return schema.validate(subject);
}

const SchoolYear = mongoose.model("SchoolYear", schoolYearSchema);

exports.SchoolYear = SchoolYear;
exports.validateSchoolYear = validateSchoolYear;
