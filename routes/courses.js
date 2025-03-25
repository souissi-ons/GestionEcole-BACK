const router = require("express").Router();
const _ = require("lodash");
const Joi = require("joi");
const { Course } = require("../models/course");
const { Classe } = require("../models/classe");
const { LevelSubject } = require("../models/levelSubject");
const { Session } = require("../models/session");
const { ROLES, User } = require("../models/user");

// Add a course
router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      classe: Joi.string().required(),
      levelSubject: Joi.string().required(),
      teacher: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const classe = await Classe.findById(req.body.classe);
    if (!classe) return res.status(400).send("Invalid classe");

    const levelSubject = await LevelSubject.findById(req.body.levelSubject);
    if (!levelSubject) return res.status(400).send("Invalid level subject");

    const teacher = await User.findOne({
      _id: req.body.teacher,
      role: ROLES.TEACHER,
    });
    if (!teacher) return res.status(400).send("Invalid teacher");
    let existingCourse = await Course.findOne({
      classe: req.body.classe,
      levelSubject: req.body.levelSubject,
    });
    if (existingCourse) return res.status(400).send("Course already exists");
    const course = new Course({
      classe: req.body.classe,
      levelSubject: req.body.levelSubject,
      teacher: req.body.teacher,
    });
    await course.save();
    res.status(200).send(course);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all courses
router.get("/", async (req, res) => {
  try {
    let courses = await Course.find()
      .populate("classe")
      .populate("teacher", "-password") // populate the 'teacher' field of 'subjects' and exclude the 'password' field
      .populate("levelSubject"); // populate the 'students' field of 'subjects';
    res.send(courses);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get a particular course
router.get("/:id", async (req, res) => {
  try {
    let course = await Course.findById(req.params.id)
      .populate("classe")
      .populate("teacher", "-password") // populate the 'teacher' field of 'subjects' and exclude the 'password' field
      .populate("levelSubject"); // populate the 'students' field of 'subjects'
    if (!course) res.sendStatus(400);
    res.send(course);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular courses
router.put("/:id", async (req, res) => {
  try {
    const schema = Joi.object({
      classe: Joi.string().required(),
      teacher: Joi.string().required(),
      levelSubject: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(400).send("Invalid course");
    const classe = await Classe.findById(req.body.classe);
    if (!classe) return res.status(400).send("Invalid classe");
    const levelSubject = await LevelSubject.findById(req.body.levelSubject);
    if (!levelSubject) return res.status(400).send("Invalid level subject");
    const teacher = await User.findOne({
      _id: req.body.teacher,
      role: ROLES.TEACHER,
    });
    if (!teacher) return res.status(400).send("Invalid teacher");
    let session;

    // Delete all sessions of the course if the teacher is changed
    if (!course.teacher.equals(teacher._id)) {
      session = await Session.deleteMany({
        teacher: course.teacher,
        classe: req.body.classe,
        levelSubject: req.body.levelSubject,
      });
      console.log(session);
    }

    course.levelSubject = req.body.levelSubject;
    course.teacher = req.body.teacher;
    await course.save();
    res.status(200).send(course);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular course
// router.delete("/:id", async (req, res) => {
//   try {
//     const course = await Course.findByIdAndDelete(req.params.id);
//     if (!course) res.status(400);
//     res.send(course);
//   } catch (error) {
//     res.status(500).send(`Internal server error: ${error.message}`);
//   }
// });

module.exports = router;
