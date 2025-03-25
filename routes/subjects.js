const { Subject, validateSubject } = require("../models/subject");
const { LevelSubject } = require("../models/levelSubject");
const router = require("express").Router();
const _ = require("lodash");
const mongoose = require("mongoose");

// Add a subject
router.post("/", async (req, res) => {
  try {
    const { error } = validateSubject(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const subject = await Subject.findOne({
      subjectName: {
        $regex: new RegExp(`^${req.body.subjectName.trim()}$`, "i"),
      }, // case insensitive when comparing
    });
    if (subject) return res.status(400).send("Subject already exists");
    let newSubject = new Subject({
      subjectName: req.body.subjectName.trim(),
      color: req.body.color,
    });
    await newSubject.save();
    res.status(200).send();
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all subjects
router.get("/", async (req, res) => {
  try {
    let subjects = await Subject.find();
    res.send(subjects);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular subject
router.delete("/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(400).send("Matière introuvable.");
    const levelSubject = await LevelSubject.findOne({ subject: req.params.id });
    if (levelSubject)
      return res
        .status(409)
        .send("La matière est associée à un cours. Impossible de supprimer.");

    await subject.deleteOne();
    res.send(subject);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular subject
router.put("/:id", async (req, res) => {
  try {
    const { error } = validateSubject(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(400).send("Subject with the given id not found");
    }

    const existingSubject = await Subject.findOne({
      _id: { $ne: req.params.id },
      subjectName: {
        $regex: new RegExp(`^${req.body.subjectName.trim()}$`, "i"),
      },
    });
    if (existingSubject) {
      return res.status(400).send("Subject already exists");
    }

    subject.subjectName = req.body.subjectName.trim();
    subject.color = req.body.color;

    await subject.save();

    res.status(200).send("Subject has been successfully updated");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
