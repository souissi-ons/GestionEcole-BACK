const mongoose = require("mongoose");
const Joi = require("joi");

const classeSchema = mongoose.Schema({
  classeName: {
    type: String,
    required: true,
  },
  level: {
    type: mongoose.Types.ObjectId,
    ref: "Level",
    required: true,
  },
  schoolYear: {
    type: mongoose.Types.ObjectId,
    ref: "SchoolYear",
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  timetableVisibility: {
    type: Boolean,
    required: true,
    default: false,
  },
  students: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Classe = mongoose.model("Classe", classeSchema);

exports.Classe = Classe;
