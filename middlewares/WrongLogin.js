const Joi = require("joi");
const { User } = require("../models/user");
const { RestrictedIP } = require("../models/restrictedIp");
const WRONG_EMAIL_ATTEMPTS = 3;
const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds

module.exports = async function (req, res, next) {
  const { error } = validate(req.body);
  let restrictedIP = await RestrictedIP.findOne({ ipAddress: req.ip });
  if ((restrictedIP && restrictedIP.attempts >= WRONG_EMAIL_ATTEMPTS) || error)
    return res.status(400).send("Vous êtes bloqué !");

  const user = await User.findOne({
    archived: false,
    $or: [
      { email: req.body.emailOrNumber.toLowerCase() },
      { phoneNumber: req.body.emailOrNumber.replace(/\s+/g, "") },
    ],
  });
  if (!user) {
    if (restrictedIP) {
      restrictedIP.attempts += 1;
      await restrictedIP.save();
    } else {
      restrictedIP = await RestrictedIP.create({
        ipAddress: req.ip, // The IP address to be restricted
        description:
          "Restricted IP for multiple login attempts using wrong identifier", // Description of the restriction
        expirationDate: new Date(Date.now() + oneDay), // Expiration date set to one day in the future
        attempts: 1, // Optional number of attempts
      });
    }
    return res
      .status(400)
      .send(
        "L'identifiant saisi est erroné. Veuillez vérifier vos coordonnés ! Tentatives restantes " +
          (WRONG_EMAIL_ATTEMPTS - restrictedIP.attempts)
      );
  }

  if (user.archived === true) {
    return res.status(401).send("Account suspended.");
  }
  req.user = user;
  return next();
};

function validate(user) {
  const schema = Joi.object({
    emailOrNumber: Joi.string(),
    password: Joi.string().min(3).max(255).required(),
  });
  return schema.validate(user);
}
