const { Session, validateSession } = require("../models/session");
const { User, ROLES } = require("../models/user");
const { Classe } = require("../models/classe");
const { Room } = require("../models/room");
const { SchoolYear } = require("../models/schoolYear");
const checkRoomAvailability = require("../middlewares/checkRoomAvailability");
const checkClassAvailability = require("../middlewares/checkClassAvailability");
const checkTeacherAvailability = require("../middlewares/checkTeacherAvailability");
const { Course } = require("../models/course");
const router = require("express").Router();
const mongoose = require("mongoose");
const { AttendanceSheet } = require("../models/attendanceSheet");

// Add a session
router.post(
  "/",
  [checkRoomAvailability, checkClassAvailability, checkTeacherAvailability],
  async (req, res) => {
    try {
      const { error } = validateSession(req.body);
      if (error) return res.status(400).send(error.details[0].message);
      if (req.body.startTime > req.body.endTime)
        return res
          .status(400)
          .send("The end hour must be greater than the start hour.");
      const classe = await Classe.findOne({ _id: req.body.classe });
      if (!classe) return res.status(400).send("Invalid classe");
      const room = await Room.findOne({ _id: req.body.room });
      if (!room) return res.status(400).send("Invalid room");

      const currentYear = await SchoolYear.findOne({ current: true });

      const newSession = new Session({
        classe: classe._id,
        room: room._id,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        levelSubject: req.body.levelSubject,
        day: req.body.day,
        week: req.body.week,
        group: req.body.group,
        teacher: req.body.teacher,
        color: req.body.color,
        schoolYear: currentYear._id,
      });
      await newSession.save();
      const session = await Session.findById(newSession._id)
        .populate("room teacher classe levelSubject")
        .populate({
          path: "levelSubject",
          populate: {
            path: "subject",
          },
        });
      res.status(200).send(session);
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Update a particular session
router.put(
  "/:id",
  [checkRoomAvailability, checkClassAvailability, checkTeacherAvailability],
  async (req, res) => {
    try {
      const { error } = validateSession(req.body);
      if (error) return res.status(400).send(error.details[0].message);
      const currentSession = await Session.findOne({ _id: req.params.id });
      if (!currentSession) return res.status(400).send("Invalid session");
      if (req.body.startTime > req.body.endTime)
        return res
          .status(400)
          .send("The end hour must be greater than the start hour.");
      const classe = await Classe.findOne({ _id: req.body.classe });
      if (!classe) return res.status(400).send("Invalid classe");
      const room = await Room.findOne({ _id: req.body.room });
      if (!room) return res.status(400).send("Invalid room");
      const updatedSession = await Session.findByIdAndUpdate(
        req.params.id,
        {
          classe: req.body.classe,
          room: req.body.room,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          levelSubject: req.body.levelSubject,
          day: req.body.day,
          week: req.body.week,
          group: req.body.group,
          teacher: req.body.teacher,
          color: req.body.color,
        },
        { new: true }
      );
      const session = await Session.findById(updatedSession._id)
        .populate("room teacher classe levelSubject")
        .populate({
          path: "levelSubject",
          populate: {
            path: "subject",
          },
        });
      res.status(200).send(session);
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Delete a particular session
router.delete("/:id", async (req, res) => {
  try {
    let session = await Session.findById(req.params.id)
      .populate("levelSubject")
      .populate("room")
      .populate("teacher");
    if (!session)
      return res.status(400).send("Session with given id not found");
    const attendanceSheets = await AttendanceSheet.findOne({
      session: req.params.id,
    });
    if (attendanceSheets)
      return res
        .status(409)
        .send(
          "La séance est associée à une feuille de présence. Impossible de la supprimer."
        );
    await session.deleteOne();
    res.send(session);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all sessions
router.get("/", async (req, res) => {
  try {
    let sessions = await Session.find();
    res.send(sessions);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get teacher's timetable
router.get("/teacher", async (req, res) => {
  try {
    await Session.updateMany({
      schoolYear: new mongoose.Types.ObjectId("643dd94ec1251666f09cf8ff"),
    });

    const user = await User.findOne({
      email: req.session.user.email,
      role: ROLES.TEACHER,
    });
    if (!user) return res.status(404).send("Teacher not found");
    const currentYear = await SchoolYear.findOne({ current: true });

    const sessions = await Session.find({
      teacher: user._id,
      schoolYear: currentYear._id,
    })
      .populate({
        path: "room",
        select: "_id roomName",
      })
      .populate({
        path: "classe",
        select: "_id classeName",
      })
      .populate({
        path: "levelSubject",
        populate: "subject",
      });

    res.send({
      sessions,
      schoolYear: currentYear.schoolYear,
      teacherName: user.firstName + " " + user.lastName,
    });
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get student's timetable
router.get("/student", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.session.user.email,
      role: ROLES.STUDENT,
    });
    if (!user) return res.status(404).send("Student not found");
    const currentYear = await SchoolYear.findOne({ current: true });
    const classe = await Classe.findOne({
      schoolYear: currentYear.id,
      students: user._id,
    });

    let sessions = [];

    if (classe && classe.timetableVisibility)
      sessions = await Session.find({ classe: classe._id })
        .populate({
          path: "room",
          select: "_id roomName",
        })
        .populate({
          path: "classe",
          select: "_id classeName",
        })
        .populate({
          path: "levelSubject",
          populate: "subject",
        });
    return res.status(200).send({
      sessions,
      classeName: classe.classeName,
      schoolYear: currentYear.schoolYear,
    });
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
    console.log(error);
  }
});

//Get tutor's timetables
router.get("/tutor", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.session.user.email,
      role: ROLES.TUTOR,
    });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const currentYear = await SchoolYear.findOne({ current: true });
    const studentsSessions = [];
    const students = await User.find({
      role: ROLES.STUDENT,
      "studentData.tutor": user._id,
    }).select("firstName lastName ");
    for (const student of students) {
      const classe = await Classe.findOne({
        schoolYear: currentYear.id,
        students: student._id,
      });
      if (!classe) studentsSessions.push({ student, sessions: [], classe: "" });
      else {
        if (classe.timetableVisibility) {
          const sessions = await Session.find({ classe: classe._id })
            .populate({
              path: "room",
              select: "roomName",
            })
            .populate({
              path: "levelSubject",
              select: "levelSubject",
              populate: "subject",
            })
            .populate({
              path: "teacher",
              select: "firstName lastName",
            });
          studentsSessions.push({
            student,
            sessions,
            classeName: classe.classeName,
            schoolYear: currentYear.schoolYear,
          });
        } else {
          studentsSessions.push({
            student,
            sessions: [],
            classeName: classe.classeName,
            schoolYear: currentYear.schoolYear,
          });
        }
      }
    }
    return res.status(200).send(studentsSessions);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all sessions of a particular class
router.get("/:id", async (req, res) => {
  try {
    const sessions = await Session.find({ classe: req.params.id })
      .populate({
        path: "teacher",
        select: "firstName lastName",
      })
      .populate({
        path: "room",
        select: "_id roomName",
      })
      .populate({
        path: "levelSubject",
        populate: "subject",
      });

    // const sessions = await Session.aggregate([
    //   {
    //     $match: {
    //       classe: new mongoose.Types.ObjectId(req.params.id),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "levelsubjects",
    //       localField: "levelSubject",
    //       foreignField: "_id",
    //       as: "levelSubject",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "subjects",
    //       localField: "levelSubject.subject",
    //       foreignField: "_id",
    //       as: "levelSubject.subject",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "rooms",
    //       localField: "room",
    //       foreignField: "_id",
    //       as: "room",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "teacher",
    //       foreignField: "_id",
    //       as: "teacher",
    //     },
    //   },
    //   {
    //     $unwind: "$levelSubject",
    //   },
    //   {
    //     $unwind: "$levelSubject.subject",
    //   },
    //   {
    //     $unwind: "$room",
    //   },
    //   {
    //     $unwind: "$teacher",
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       day: 1,
    //       week: 1,
    //       group: 1,
    //       color: 1,
    //       startTime: 1,
    //       endTime: 1,
    //       levelSubject: {
    //         _id: 1,
    //         subject: 1,
    //         hoursNumber: 1,
    //         coefficient: 1,
    //       },
    //       room: {
    //         _id: 1,
    //         roomName: 1,
    //       },
    //       teacher: {
    //         _id: 1,
    //         firstName: 1,
    //         lastName: 1,
    //       },
    //     },
    //   },
    // ]);
    if (!sessions) res.sendStatus(400);
    res.send(sessions);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
