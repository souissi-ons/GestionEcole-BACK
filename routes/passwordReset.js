const { User, ROLES } = require("../models/user");
const Token = require("../models/token");
const { sendResetPasswordEmail } = require("../utils/sendEmail");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.sendStatus(200);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.sendStatus(200);

    let token = await Token.findOne({ userId: user._id });
    if (!token) {
      token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
    }
    const link = `${process.env.BASE_URL}/password-reset/${user._id}/${token.token}`;
    let civility = "";
    if (user.role !== ROLES.STUDENT) {
      if (user.gender === "male") civility = "monsieur";
      else civility = "madame";
    }
    sendResetPasswordEmail(
      user.email,
      "Password reset",
      link,
      civility,
      user.firstName,
      user.lastName
    );

    res.send("Password reset link sent to your email account");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/:userId/:token", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(400).send("Invalid link or expired");

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token) return res.status(400).send("Invalid link or expired");

    const schema = Joi.object({
      password: Joi.string().min(6).required(),
      passwordConfirm: Joi.string().valid(Joi.ref("password")).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    user.password = hashedPassword;
    await user.save();

    await token.deleteOne({ userId: user._id, token: req.params.token });

    res.send("Password reset successful");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/validate-token/:userId/:token", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(400).send("Invalid link or expired");
    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token) return res.status(400).send("Invalid link or expired");
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = router;
