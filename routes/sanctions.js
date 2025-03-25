const { Classe } = require("../models/classe");
const router = require("express").Router();
const { SchoolYear } = require("../models/schoolYear");
const { Session } = require("../models/session");
const { ROLES, User } = require("../models/user");
const dayjs = require("dayjs");
const { Sanction, validateSanction, STATUSES } = require("../models/sanction");
const Joi = require("joi");
const { sendSms } = require("../utils/sendSms");

router.post("/", async (req, res) => {
  try {
    const { error } = validateSanction(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const currentYear = await SchoolYear.findOne({ current: true });

    const now = dayjs();

    let sanction = new Sanction({
      type: req.body.type,
      description: req.body.description,
      date: now,
      student: req.body.student,
      schoolYear: currentYear._id,
      sanctionIssuer: req.session.user._id,
      // sanctionIssuer: req.params.id,
    });
    sanction = await sanction.save();
    return res.status(200).send(sanction);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put("/:id", async (req, res) => {
  try {
    // const { error } = validateSanction(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let sanction = await Sanction.findById(req.params.id);
    if (!sanction) return res.status(200).send("Sanction not found");
    sanction.type = req.body.type;
    sanction.description = req.body.description;
    sanction.status = STATUSES.PENDING;
    sanction = await sanction.save();
    return res.status(200).send(sanction);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const sanction = await Sanction.findByIdAndRemove({
      _id: req.params.id,
    });
    if (!sanction) return res.status(404).send("Sanction not found");
    return res.status(200).send(sanction);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/", async (req, res) => {
  try {
    const sanctions = await Sanction.find()
      .populate("student", "firstName lastName")
      .populate("sanctionIssuer", "firstName lastName");
    return res.status(200).send(sanctions);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/issued", async (req, res) => {
  try {
    if (req.session.user.role === ROLES.STUDENT)
      return res.status(403).send("Access denied");
    const sanctions = await Sanction.find({
      sanctionIssuer: req.session.user._id,
    }).populate("student", "firstName lastName");
    return res.status(200).send(sanctions);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put("/:id/change-status", async (req, res) => {
  try {
    if (!Object.values(STATUSES).includes(req.body.status))
      return res.status(400).send("Invalid status");
    const sanctions = await Sanction.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (sanctions.status === STATUSES.VALIDATED) {
      const student = await User.findById(sanctions.student);
      const tutor = await User.findById(student.studentData.tutor);
      if (!tutor) return res.status(400).send("Tutor not found");
      const civility = tutor.gender === "male" ? "monsieur" : "madame";

      const message = `Bonjour ${civility} ${tutor.firstName} ${tutor.lastName}, 
        Nous tenons à vous informer de la sanction de votre enfant ${student.firstName} ${student.lastName}: 
        type: ${sanctions.type} , 
        description : ${sanctions.description} .
    Essor Education.`;
      // return sendSms("message", "+216" + tutor.phoneNumber);

      sendSms(message, "+21655656960");
      return res.status(200).send("SMS envoyé");
    }
    return res.status(200).send(sanctions);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = router;
