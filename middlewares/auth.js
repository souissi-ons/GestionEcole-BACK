const { User } = require("../models/user");
module.exports = async function (req, res, next) {
  const email = req.session.user?.email;
  if (!email) return res.status(401).send("Access denied. Not authenticated.");
  const user = await User.findOne({ email });
  if (!user) return res.status(401).send("Access denied. Not authenticated.");
  if (user.archived === true) {
    return res.status(401).send("Account suspended.");
  }
  req.user = user;
  return next();
};
