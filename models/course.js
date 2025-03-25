const mongoose = require("mongoose");
const Joi = require("joi");

const courseSchema = mongoose.Schema({
  classe: {
    type: mongoose.Types.ObjectId,
    ref: "Classe",
    required: true,
  },
  teacher: {
    type: mongoose.Types.ObjectId,
    ref: "User", // teacher
    required: true,
  },
  levelSubject: {
    type: mongoose.Types.ObjectId,
    ref: "LevelSubject",
    required: true,
  },
});

const Course = mongoose.model("Course", courseSchema);

exports.Course = Course;
