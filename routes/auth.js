const router = require("express").Router();
const { User } = require("../models/user");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { OAuth2Client } = require("google-auth-library");
const authMiddleware = require("../middlewares/auth");
const WrongLoginMiddleware = require("../middlewares/WrongLogin");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const MAX_LOGIN_ATTEMTPS = 5;
router.post("/login/google", async (req, res) => {
  try {
    // Verify the Google access token
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload["email"];
    // Verify the existence of the email in the database
    let user = await User.findOne({ email: email.toLowerCase() }).select(
      "-password"
    );
    if (!user)
      return res
        .status(400)
        .send(
          "L'identifiant saisi est erroné. Veuillez vérifier vos coordonnés ! "
        );
    if (user.locked)
      return res
        .status(400)
        .send("Votre compte est bloqué, contactez l'administrateur");
    // reset login attempts
    user.loginAttempts = 0;
    await user.save();
    // Create a session for the user
    user.password = undefined;
    req.session.user = user;
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/check-authentication", async (req, res) => {
  try {
    if (req.session.user.email) {
      const user = await User.findOne({
        email: req.session.user.email,
      }).select("-password");
      res.status(200).send(user);
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/logout", authMiddleware, (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        res.clearCookie("connect.sid");
        res.sendStatus(200);
      }
    });
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/me", async (req, res) => {
  try {
    if (!req.session.user.email) return res.sendStatus(400);
    const user = await User.findOne({ email: req.session.user.email }).select(
      "-password"
    );
    res.send(user);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/", WrongLoginMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (user.locked)
      return res
        .status(400)
        .send("Votre compte est bloqué, contactez l'administrateur");

    const isValidPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!isValidPassword) {
      user.loginAttempts += 1;

      // lock the account if login attempts exceed the maximum number of login attempts
      if (user.loginAttempts >= MAX_LOGIN_ATTEMTPS) {
        user.loginAttempts = 0;
        user.locked = true;
        await user.save();
        return res
          .status(400)
          .send("Votre compte est bloqué, contactez l'administrateur");
      }
      await user.save();
      return res
        .status(400)
        .send(
          "Il vous reste " +
            (MAX_LOGIN_ATTEMTPS - user.loginAttempts) +
            " tentatives"
        );
    }
    // reset login attempts
    user.loginAttempts = 0;
    await user.save();

    // Create a session for the user
    user.password = undefined;
    req.session.user = user;

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

function validate(user) {
  const schema = Joi.object({
    emailOrNumber: Joi.string(),
    password: Joi.string().min(3).max(255).required(),
  });
  return schema.validate(user);
}

module.exports = router;
