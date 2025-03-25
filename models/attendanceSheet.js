const mongoose = require("mongoose");
const Joi = require("joi");

const attendanceSheetSchema = mongoose.Schema({
  session: {
    type: mongoose.Types.ObjectId,
    ref: "Session",
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  schoolYear: {
    type: mongoose.Types.ObjectId,
    ref: "SchoolYear",
    required: true,
  },
  attendances: [
    {
      student: {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        required: true,
        enum: ["A", "R", "P", "E"],
        default: "P",
      },
    },
  ],
  validated: {
    type: Boolean,
    default: false,
  },
});

const AttendanceSheet = mongoose.model(
  "AttendanceSheet",
  attendanceSheetSchema
);

exports.AttendanceSheet = AttendanceSheet;
