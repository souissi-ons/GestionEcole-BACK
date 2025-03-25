const { SchoolYear, validateSchoolYear } = require("../models/schoolYear");
const { Level } = require("../models/level");
const { Subject } = require("../models/subject");
const { LevelSubject } = require("../models/levelSubject");
const router = require("express").Router();

// Add a school year
router.post("/", async (req, res) => {
  try {
    // const { error } = validateSchoolYear(req.body);
    // if (error) return res.status(400).send(error.details[0].message);
    let schoolYear = await SchoolYear.findOne({
      schoolYear: req.body.schoolYear,
    });
    if (schoolYear) return res.status(409).send("School year already exists");
    const newSchoolYear = new SchoolYear({
      schoolYear: req.body.schoolYear,
    });
    newSchoolYear.current = true;
    await newSchoolYear.save();
    let lastSchoolYear = await SchoolYear.findOne({
      _id: { $ne: newSchoolYear._id },
      current: true,
    });
    if (lastSchoolYear) {
      lastSchoolYear.current = false;
      await lastSchoolYear.save();
      if (req.body.keepLevels) {
        // Cloning levels
        const oldLevels = await Level.find({
          schoolYear: lastSchoolYear._id,
        });
        const clonedLevels = oldLevels.map((level) => {
          return {
            ...level.toObject(),
            schoolYear: newSchoolYear.id,
          };
        });

        // Cloning subjects
        if (clonedLevels.length > 0) {
          const insertedLevels = await Level.insertMany(clonedLevels);
          for (const insertedLevel of insertedLevels) {
            const oldLevel = await Level.findOne({
              level: insertedLevel.level,
              schoolYear: lastSchoolYear.id,
            });
            const previousSubjects = await LevelSubject.find({
              level: oldLevel._id,
            });
            const clonedSubjects = previousSubjects.map((subject) => {
              return {
                ...subject.toObject(),
                level: insertedLevel.id,
              };
            });
            if (clonedSubjects.length > 0) {
              await LevelSubject.insertMany(clonedSubjects);
            }
          }
        }
      }
    }
    res.send(newSchoolYear);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all school years
router.get("/", async (req, res) => {
  try {
    let schoolYears = await SchoolYear.find();
    res.send(schoolYears);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular school year
router.put("/:id", async (req, res) => {
  try {
    const { error } = validateSchoolYear(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let schoolYear = await SchoolYear.findOne({ _id: req.params.id });
    if (!schoolYear)
      return res.status(400).send("SchoolYear with given id not found");
    schoolYear = await SchoolYear.findOne({
      schoolYear: req.body.schoolYear,
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (schoolYear) return res.status(400).send("SchoolYear already exists");
    const updatedSchoolYear = await SchoolYear.findOne({ _id: req.params.id });
    updatedSchoolYear.schoolYear = req.body.schoolYear;
    await updatedSchoolYear.save();
    res.status(200).send(updatedSchoolYear);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular school year
router.delete("/:id", async (req, res) => {
  try {
    const schoolYear = await SchoolYear.findById({ _id: req.params.id });
    if (!schoolYear)
      return res.status(400).send("SchoolYear with given id not found");
    const level = await Level.findOne({ schoolYear: req.params.id });
    if (level)
      return res
        .status(409)
        .send("L'année est associée à un niveau. Impossible de la supprimer.");
    await schoolYear.deleteOne();
    res.send(schoolYear);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
