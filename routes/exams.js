const mongoose = require("mongoose");
const { Exam, validateExam } = require("../models/exam");
const { Subject } = require("../models/subject");
const router = require("express").Router();

// Add an exam
router.post("/", async (req, res) => {
  try {
    const { error } = validateExam(req.body);
    if (!mongoose.Types.ObjectId.isValid(req.body.subject))
      return res.status(400).send("Invalid subject");
    if (error) return res.status(400).send(error.details[0].message);
    const subject = await Subject.findOne({ _id: req.body.subject });
    if (!subject) return res.status(400).send("Invalid subject");
    const exam = await Exam.findOne({
      subject: subject._id,
      exam: { $regex: new RegExp(`^${req.body.exam.trim()}$`, "i") }, // case insensitive when comparing})
    });
    if (exam) return res.status(400).send("Exam already exists");
    let newExam = new Exam({
      subject: req.body.subject,
      exam: req.body.exam.trim(),
      coefficient: req.body.coefficient,
    });
    await newExam.save();
    res.status(200).send(newExam);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular exam
router.put("/:id", async (req, res) => {
  try {
    const { error } = validateExam(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let exam = await Exam.findById({ _id: req.params.id });
    if (!exam) return res.status(400).send("Exam with given id not found ");
    const subject = await Subject.findOne({ _id: req.body.subject });
    if (!subject) return res.status(400).send("Invalid subject");

    existingExam = await Exam.findOne({
      subject: subject._id,
      exam: { $regex: new RegExp(`^${req.body.exam.trim()}$`, "i") }, // case insensitive when comparing})
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (existingExam) return res.status(400).send("Exam already exists");
    exam.subject = req.body.subject;
    exam.exam = req.body.exam.trim();
    exam.coefficient = req.body.coefficient;
    await exam.save();
    res.status(200).send(exam);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all exams
router.get("/", async (req, res) => {
  try {
    let exams = await Exam.find().populate("subject");
    res.send(exams);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
