const { Level } = require("../models/level");
const { SchoolYear } = require("../models/schoolYear");
const router = require("express").Router();
const Joi = require("joi");
const { LevelSubject } = require("../models/levelSubject");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");
const { Classe } = require("../models/classe");
const { Session } = require("../models/session");
const { Course } = require("../models/course");
const { Exam } = require("../models/exam");
const mongoose = require("mongoose");
// Add a level
router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      levelName: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let currentYear = await SchoolYear.findOne({
      current: true,
    });
    let level = await Level.findOne({
      levelName: { $regex: new RegExp(`^${req.body.levelName.trim()}$`, "i") }, // case insensitive when comparing
      schoolYear: currentYear._id,
    });
    if (level) return res.status(400).send("Level already exists");
    level = new Level({
      levelName: req.body.levelName.trim(),
      schoolYear: currentYear._id,
    });
    await level.save();
    res.status(200).send(level);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// router.post("/check-level", async (req, res) => {
//   let level = await Level.findOne({
//     level: req.body.levelName.replace(/\s+/g, ""),
//   }).select("level");
//   if (level) return res.status(409).send("Level already exists.");
//   return res.sendStatus(200);
// });

// Get all levels
router.get("/", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });
    if (!currentYear) res.send("something went wrong");
    const levels = await Level.find({ schoolYear: currentYear._id });
    res.send(levels);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get a particular level
router.get("/:id", async (req, res) => {
  try {
    const level = await Level.findOne({ _id: req.params.id });
    if (!level) return res.status(400).send("Level with given id not found");
    res.send(level);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/:id/subjects", async (req, res) => {
  try {
    const results = await Level.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "levelsubjects",
          localField: "_id",
          foreignField: "level",
          as: "levelSubject",
        },
      },
      {
        $unwind: {
          path: "$levelSubject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "levelSubject.subject",
          foreignField: "_id",
          as: "levelSubject.subject",
        },
      },
      {
        $unwind: {
          path: "$levelSubject.subject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          levelName: {
            $first: "$levelName",
          },
          levelSubjects: {
            $push: "$levelSubject",
          },
        },
      },
      {
        $project: {
          _id: 1,
          levelName: "$levelName",
          levelSubjects: {
            $filter: {
              input: "$levelSubjects",
              cond: { $ne: ["$$this", {}] },
            },
          },
        },
      },
    ]);
    res.status(200).send(results[0]);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular level
router.put("/:id", async (req, res) => {
  try {
    const schema = Joi.object({
      levelName: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let level = await Level.findById(req.params.id);
    if (!level) return res.status(400).send("Level with given id not found");
    const currentSchoolYear = await SchoolYear.findOne({ current: true });
    level = await Level.findOne({
      schoolYear: currentSchoolYear._id,
      levelName: { $regex: new RegExp(`^${req.body.levelName.trim()}$`, "i") }, // case insensitive when comparing
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (level) return res.status(400).send("Level already exists");
    const updatedLevel = await Level.findOne({ _id: req.params.id });
    updatedLevel.levelName = req.body.levelName.trim();
    console.log(updatedLevel);
    await updatedLevel.save();
    res.status(200).send(updatedLevel);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular level
router.delete("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const level = await Level.findById({ _id: req.params.id });
    if (!level) return res.status(400).send("Level with given id not found");
    const classe = await Classe.findOne({ level: req.params.id });
    if (classe)
      return res
        .status(409)
        .send(
          "Le niveau est associée à une classe. Impossible de le supprimer."
        );
    await level.deleteOne();
    res.send(level);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = router;
