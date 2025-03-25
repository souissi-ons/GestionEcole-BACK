const { ROLES, User } = require("../models/user");

const validatePhoneNumber = async (req, res, next) => {
  const { role, phoneNumber, email } = req.body;

  if (role !== ROLES.STUDENT && !phoneNumber) {
    return res.status(400).send("Phone number is required");
  }

  if (role === ROLES.STUDENT && !phoneNumber) {
    return next();
  }

  const cleanedPhoneNumber = phoneNumber.replace(/\s+/g, "");
  const user = await User.findOne({
    phoneNumber: cleanedPhoneNumber,
    email: { $ne: email },
  });

  if (user) {
    return res.status(400).send("Phone number is already used");
  }

  return next();
};

module.exports = validatePhoneNumber;
