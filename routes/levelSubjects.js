const {
  LevelSubject,
  validateLevelSubject,
} = require("../models/levelSubject");
const { Level } = require("../models/level");
const router = require("express").Router();
const _ = require("lodash");
const mongoose = require("mongoose");
const { Session } = require("../models/session");
const { Exam } = require("../models/exam");
const { Course } = require("../models/course");

// Add a levelSubject
router.post("/", async (req, res) => {
  try {
    const { error } = validateLevelSubject(req.body);
    if (!mongoose.Types.ObjectId.isValid(req.body.level))
      return res.status(400).send("Invalid level");
    if (error) return res.status(400).send(error.details[0].message);
    const level = await Level.findOne({ _id: req.body.level });
    if (!level) return res.status(400).send("Invalid level");
    const levelSubject = await LevelSubject.findOne({
      level: level._id,
      subject: req.body.subject,
    });
    if (levelSubject) return res.status(400).send("LevelCourse already exists");

    await LevelSubject.create(req.body);
    res.status(200).send();
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all levelSubjects
router.get("/", async (req, res) => {
  try {
    let levelSubjects = await LevelSubject.find().populate("subject");
    res.send(levelSubjects);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all exams of a particular levelSubject
// router.get("/:id/exams", async (req, res) => {
//   try {
//     let levelSubject = await LevelCourse.findById({ _id: req.params.id });
//     if (!levelSubject)
//       return res.status(400).send("LevelCourse with given id not found ");
//     let exams = await Exam.find({ levelSubject: req.params.id });
//     res.send(exams);
//   } catch (error) {
//     res.status(500).send(`Internal server error: ${error.message}`);
//   }
// });

// Delete a particular levelSubject
router.delete("/:id", async (req, res) => {
  try {
    const levelSubject = await LevelSubject.findById({
      _id: req.params.id,
    });
    if (!levelSubject)
      return res.status(400).send("LevelCourse with given id not found");
    const course = await Course.findOne({ levelSubject: req.params.id });

    if (course)
      return res
        .status(409)
        .send("La matière est associée à un cours. Impossible de la supprimer.");
    await levelSubject.deleteOne()
    res.send(levelSubject);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular levelSubject
router.put("/:id", async (req, res) => {
  try {
    const { error } = validateLevelSubject(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let levelSubject = await LevelSubject.findById(req.params.id);
    if (!levelSubject)
      return res.status(400).send("LevelCourse with given id not found ");
    const level = await Level.findOne({ _id: req.body.level });
    if (!level) return res.status(400).send("Invalid level");
    existingLevelCourse = await LevelSubject.findOne({
      level: req.body.level,
      subject: req.body.subject,
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (existingLevelCourse)
      return res.status(400).send("LevelCourse already exists");
    levelSubject.subject = req.body.subject;
    levelSubject.hoursNumber = req.body.hoursNumber;
    levelSubject.coefficient = req.body.coefficient;

    await levelSubject.save();

    res.status(200).send("levelSubject has been successfully updated");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
