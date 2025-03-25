const mongoose = require("mongoose");
const Joi = require("joi");

const levelSchema = mongoose.Schema({
  levelName: {
    type: String,
    required: true,
  },
  schoolYear: {
    type: mongoose.Types.ObjectId,
    ref: "SchoolYear",
    required: true,
  },
});

const Level = mongoose.model("Level", levelSchema);

exports.Level = Level;
