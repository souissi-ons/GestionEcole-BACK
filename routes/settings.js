const router = require("express").Router();
const Joi = require("joi");

router.get("/week", async (req, res) => {
  try {
    week = process.env.week;
    return res.status(200).send(week);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put("/week", async (req, res) => {
  const schema = Joi.object({
    week: Joi.string().required().valid("A", "B"),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    process.env.week = req.body.week;
    res.status(200).send(process.env.week);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = router;
