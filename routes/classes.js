const { Classe } = require("../models/classe");
const router = require("express").Router();
const _ = require("lodash");
const { Level } = require("../models/level");
const Joi = require("joi");
const { SchoolYear } = require("../models/schoolYear");
const { Session } = require("../models/session");
const { Course } = require("../models/course");
const mongoose = require("mongoose");
const { LevelSubject } = require("../models/levelSubject");

// Add a class
router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      classeName: Joi.string().required(),
      level: Joi.string().required(),
      capacity: Joi.number().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const level = await Level.findOne({ _id: req.body.level });
    if (!level) return res.status(400).send("Invalid level");
    const currentYear = await SchoolYear.findOne({ current: true });
    let existingClasse = await Classe.findOne({
      classeName: {
        $regex: new RegExp(`^${req.body.classeName.trim()}$`, "i"),
      }, // case insensitive when comparing
      schoolYear: currentYear.id,
    });
    if (existingClasse) return res.status(400).send("Class already exists");
    const classe = new Classe({
      classeName: req.body.classeName.trim(),
      level: req.body.level,
      capacity: req.body.capacity,
    });
    classe.schoolYear = currentYear.id;
    await classe.save();
    res.status(200).send(classe);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all classes
router.get("/", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });
    if (!currentYear) res.send("something went wrong");
    let classes = await Classe.find({ schoolYear: currentYear._id });
    res.send(classes);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all classes of the latest school year
router.get("/lastYear", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });
    let classes = await Classe.find({ schoolYear: currentYear.id }).populate(
      "schoolYear"
    );
    res.send(classes);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

//Get a particular class
router.get("/:id", async (req, res) => {
  try {
    let classe = await Classe.findById(req.params.id)
      .populate("schoolYear")
      .populate("students");
    if (!classe) return res.status(400).send("Invalid classe");
    res.send(classe);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all courses of a particular class
router.get("/:id/courses", async (req, res) => {
  try {
    const classe = await Classe.findById(req.params.id);
    if (!classe) return res.status(404).send("Aucune classe");
    const levelSubject = await LevelSubject.find({
      level: classe.level,
    }).populate("subject");

    const courses = levelSubject.map(async (subject) => {
      const course = await Course.findOne({
        classe: req.params.id,
        levelSubject: subject._id,
      }).populate("teacher", "-password");

      return {
        _id: course ? course._id : null,
        levelSubject: subject,
        teacher: course ? course.teacher : null,
      };
    });

    const result = {
      _id: classe._id,
      classeName: classe.classeName,
      level: classe.level,
      capacity: classe.capacity,
      schoolYear: classe.schoolYear,
      students: classe.students,
      timetableVisibility: classe.timetableVisibility,
      courses: await Promise.all(courses),
    };

    if (!result) return res.status(400).send("Invalid course");
    res.send(result);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

//Get all classes of a particular school year
router.get("/year/:year", async (req, res) => {
  try {
    if (req.params.year === "latest") {
      const currentYear = await SchoolYear.findOne({ current: true });
      let classes = await Classe.find({ schoolYear: currentYear.id });
      res.send(classes);
    } else {
      let classes = await Classe.find({ schoolYear: req.params.year });
      res.send(classes);
    }
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get students of a particular class
router.get("/:id/students", async (req, res) => {
  try {
    const classe = await Classe.findOne({ _id: req.params.id }).populate(
      "students"
    );
    if (!classe) return res.status(400).send("Invalid classe");
    res.status(200).send(classe);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update students in a particular class
router.put("/:id/students", async (req, res) => {
  try {
    const schema = Joi.object({
      students: Joi.array().items(Joi.string()),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const classe = await Classe.findOne({ _id: req.params.id });
    if (!classe) return res.status(400).send("Invalid classe");
    classe.students = req.body.students;
    await classe.save();
    res.status(200).send(classe);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular class
router.put("/:id", async (req, res) => {
  try {
    const schema = Joi.object({
      classeName: Joi.string().required(),
      capacity: Joi.number().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const currentYear = await SchoolYear.findOne({ current: true });
    let classe = await Classe.findById({ _id: req.params.id });
    if (!classe) return res.status(400).send("Classe with given id not found ");
    const existingClasse = await Classe.findOne({
      classeName: {
        $regex: new RegExp(`^${req.body.classeName.trim()}$`, "i"),
      }, // case insensitive when comparing
      schoolYear: currentYear.id,
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (existingClasse)
      return res.status(409).send("Une classe portant ce nom existe.");
    const updatedClasse = await Classe.findByIdAndUpdate(
      req.params.id,
      {
        classeName: req.body.classeName.trim(),
        level: req.body.level,
        capacity: req.body.capacity,
      },
      { new: true }
    );
    res.status(200).send(updatedClasse);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update timeTable visibility
router.put("/:id/timetable-visibility", async (req, res) => {
  try {
    const schema = Joi.object({
      timetableVisibility: Joi.boolean().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const classe = await Classe.findById({ _id: req.params.id });
    if (!classe) return res.status(400).send("Classe with given id not found ");
    classe.timetableVisibility = req.body.timetableVisibility;
    await classe.save();
    res.status(200).send("Timetable Visibility has been successfully changed");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular class
router.delete("/:id", async (req, res) => {
  try {
    const classe = await Classe.findByIdAndDelete(req.params.id);
    if (!classe) res.status(400).send("Class with given id not found");

    const course = await Course.findOne({ classe: req.params.id });
    if (course)
      return res
        .status(409)
        .send("La classe est associée à un cours. Impossible de la supprimer.");
    await classe.deleteOne();
    res.send(classe);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
