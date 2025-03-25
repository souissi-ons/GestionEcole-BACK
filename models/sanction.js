const mongoose = require("mongoose");
const Joi = require("joi");

const STATUSES = {
  PENDING: "en attente",
  VALIDATED: "validée",
  REFUSED: "refusée",
};

const SanctionSchema = mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  schoolYear: {
    type: mongoose.Types.ObjectId,
    ref: "SchoolYear",
    required: true,
  },
  student: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  sanctionIssuer: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    default: STATUSES.PENDING,
  },
});

function validateSanction(user) {
  const schema = Joi.object({
    type: Joi.string().required(),
    description: Joi.string().allow(""),
    student: Joi.string().required(),
  });
  return schema.validate(user);
}

const Sanction = mongoose.model("Sanction", SanctionSchema);

exports.Sanction = Sanction;
exports.STATUSES = STATUSES;
exports.validateSanction = validateSanction;
