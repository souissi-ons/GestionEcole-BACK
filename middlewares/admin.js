const { ROLES } = require("../models/user");

module.exports = async function (req, res, next) {
  if (process.env.REQUIRE_AUTH === "false") return next();
  if (req.user.role !== ROLES.ADMIN)
    return res.status(403).send("Access forbidden.");
  return next();
};
