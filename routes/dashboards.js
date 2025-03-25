const router = require("express").Router();
const { SchoolYear } = require("../models/schoolYear");
const { Session } = require("../models/session");
const { Sanction } = require("../models/sanction");
const { ROLES, User } = require("../models/user");
const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Joi = require("joi");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");
const { AttendanceSheet } = require("../models/attendanceSheet");
const { sendSms } = require("../utils/sendSms");
const { sendAbsenceEmail } = require("../utils/sendEmail");
const { Level } = require("../models/level");
const { Classe } = require("../models/classe");

router.get("/users", async (req, res) => {
  try {
    const countTeachers = await User.countDocuments({
      role: ROLES.TEACHER,
      archived: false,
    });
    const countTeachersMale = await User.countDocuments({
      role: ROLES.TEACHER,
      gender: "male",
      archived: false,
    });
    const countTeachersFemelle = await User.countDocuments({
      role: ROLES.TEACHER,
      gender: "femelle",
      archived: false,
    });
    const countStudents = await User.countDocuments({
      role: ROLES.STUDENT,
      archived: false,
    });
    const countStudentsMale = await User.countDocuments({
      role: ROLES.STUDENT,
      gender: "male",
      archived: false,
    });
    const countStudentsFemelle = await User.countDocuments({
      role: ROLES.STUDENT,
      gender: "femelle",
      archived: false,
    });
    const countTutors = await User.countDocuments({
      role: ROLES.TUTOR,
      archived: false,
    });
    const countTutorsMale = await User.countDocuments({
      role: ROLES.TUTOR,
      gender: "male",
      archived: false,
    });
    const countTutorsFemelle = await User.countDocuments({
      role: ROLES.TUTOR,
      gender: "femelle",
      archived: false,
    });
    const countAdmins = await User.countDocuments({
      role: ROLES.ADMIN,
      archived: false,
    });
    const countAdminsMale = await User.countDocuments({
      role: ROLES.ADMIN,
      gender: "male",
      archived: false,
    });
    const countAdminsFemelle = await User.countDocuments({
      role: ROLES.ADMIN,
      gender: "femelle",
      archived: false,
    });
    const countUsers = await User.countDocuments({ archived: false });
    const countUsersMale = await User.countDocuments({
      gender: "male",
      archived: false,
    });
    const countUsersFemelle = await User.countDocuments({
      gender: "femelle",
      archived: false,
    });
    const numbers = {
      tutors: {
        all: countTutors,
        male: countTutorsMale,
        femelle: countTutorsFemelle,
      },
      teachers: {
        all: countTeachers,
        male: countTeachersMale,
        femelle: countTeachersFemelle,
      },
      students: {
        all: countStudents,
        male: countStudentsMale,
        femelle: countStudentsFemelle,
      },
      admins: {
        all: countAdmins,
        male: countAdminsMale,
        femelle: countAdminsFemelle,
      },
      users: {
        all: countUsers,
        male: countUsersMale,
        femelle: countUsersFemelle,
      },
    };
    return res.status(200).send(numbers);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/levels", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });
    const levels = await Level.find({ schoolYear: currentYear._id });
    const count = await Promise.all(
      levels.map(async (level) => {
        const countStudents = await User.countDocuments({
          role: ROLES.STUDENT,
          "studentData.level": level._id,
        });
        return { level: level.levelName, students: countStudents };
      })
    );

    return res.status(200).send(count);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/classeAssiduities", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });

    const attendances = await AttendanceSheet.aggregate([
      {
        $match: {
          schoolYear: currentYear._id,
        },
      },
      {
        $lookup: {
          from: "sessions",
          localField: "session",
          foreignField: "_id",
          as: "session",
        },
      },
      {
        $unwind: "$session",
      },
      {
        $lookup: {
          from: "classes",
          localField: "session.classe",
          foreignField: "_id",
          as: "classe",
        },
      },
      {
        $unwind: "$classe",
      },
      {
        $unwind: "$attendances",
      },
      {
        $group: {
          _id: "$classe._id",
          className: { $first: "$classe.classeName" },

          A: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "A"] }, 1, 0],
            },
          },
          R: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "R"] }, 1, 0],
            },
          },
          E: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "E"] }, 1, 0],
            },
          },
          P: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "P"] }, 1, 0],
            },
          },
        },
      },
    ]);

    return res.status(200).send(attendances);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/monthAssiduities", async (req, res) => {
  try {
    const currentYear = await SchoolYear.findOne({ current: true });

    const attendances = await AttendanceSheet.aggregate([
      {
        $match: {
          schoolYear: currentYear._id,
        },
      },
      {
        $unwind: "$attendances",
      },
      {
        $group: {
          _id: { $month: "$date" },
          A: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "A"] }, 1, 0],
            },
          },
          R: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "R"] }, 1, 0],
            },
          },
          E: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "E"] }, 1, 0],
            },
          },
          P: {
            $sum: {
              $cond: [{ $eq: ["$attendances.status", "P"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          month: "$_id",
          A: 1,
          E: 1,
          R: 1,
          P: 1,
          _id: 0,
        },
      },
    ]);

    return res.status(200).send(attendances);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/sanctions", async (req, res) => {
  const sanctions = await Sanction.find().select("date");
  res.status(200).send(sanctions)
})
module.exports = router;
