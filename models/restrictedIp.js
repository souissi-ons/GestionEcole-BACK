const mongoose = require("mongoose");

const restrictedIPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
    index: { expires: 60 * 1000 }, // TimeToLive index
  },
  attempts: {
    type: Number,
    default: 0,
  },
});

const RestrictedIP = mongoose.model("RestrictedIP", restrictedIPSchema);
exports.RestrictedIP = RestrictedIP;
