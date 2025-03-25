const router = require("express").Router();
const { SchoolYear } = require("../models/schoolYear");
const { Session } = require("../models/session");
const { ROLES, User } = require("../models/user");
const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Joi = require("joi");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");
const { AttendanceSheet } = require("../models/attendanceSheet");
const { sendSms } = require("../utils/sendSms");
const { sendAbsenceEmail } = require("../utils/sendEmail");

router.get("/:id/details", async (req, res) => {
  try {
    const attendanceSheet = await AttendanceSheet.findById(req.params.id)
      .populate({
        path: "attendances",
        populate: { path: "student", select: "firstName lastName" },
      })
      .populate({
        path: "session",
        populate: [
          { path: "classe" },
          { path: "teacher" },
          { path: "levelSubject", populate: { path: "subject" } },
        ],
      })

      .lean();
    // hedha zeyed
    // const attendances = attendanceSheet.attendances.map((attendance) => ({
    //   student: `${attendance.student.firstName} ${attendance.student.lastName}`,
    //   status: attendance.status,
    // }));
    const sheetObject = {
      _id: attendanceSheet._id,
      subject: attendanceSheet.session.levelSubject.subject.subjectName,
      classe: attendanceSheet.session.classe.classeName,
      date: attendanceSheet.date,
      startTime: attendanceSheet.session.startTime,
      endTime: attendanceSheet.session.endTime,
      teacher: `${attendanceSheet.session.teacher.firstName} ${attendanceSheet.session.teacher.lastName}`,
      validated: attendanceSheet.validated,
      session: attendanceSheet.session._id,
      attendances: attendanceSheet.attendances,
    };

    if (!attendanceSheet) return res.status(404).send("invalid attendance");

    return res.status(200).send(sheetObject);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.get("/:id/attendance-register", async (req, res) => {
  try {
    const attendanceByClassAndDate = await AttendanceSheet.aggregate([
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
        $match: {
          "session.classe": new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "levelsubjects",
          localField: "session.levelSubject",
          foreignField: "_id",
          as: "levelSubject",
        },
      },
      {
        $unwind: "$levelSubject",
      },
      {
        $lookup: {
          from: "subjects",
          localField: "levelSubject.subject",
          foreignField: "_id",
          as: "subject",
        },
      },
      {
        $unwind: "$subject",
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
        $lookup: {
          from: "users",
          localField: "classe.students",
          foreignField: "_id",
          as: "students",
        },
      },
      {
        $unwind: "$students",
      },
      {
        $group: {
          _id: {
            classe: "$classe.classeName",
            date: "$date",
          },
          sessions: {
            $addToSet: {
              date: "$date",
              attendancsheet: "$_id",
              session: "$session._id",
              subject: "$subject.subjectName",
              startTime: "$session.startTime",
              endTime: "$session.endTime",
              attendances: "$attendances",
            },
          },
          students: {
            $addToSet: {
              student: {
                $concat: ["$students.lastName", " ", "$students.firstName"],
              },
              _id: "$students._id",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.classe",
          data: {
            $addToSet: {
              date: "$_id.date",
              sessions: "$sessions",
            },
          },
          students: {
            $first: "$students",
          },
        },
      },
      {
        $project: {
          _id: 0,
          classe: "$_id",
          data: 1,
          students: 1,
        },
      },
    ]);
    return res.status(200).send(attendanceByClassAndDate[0]);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Count P, R, A for admin with given class and date
router.get("/admin", async (req, res) => {
  try {
    const now = dayjs();
    const classe = req.query.classe;
    let date = now.format("YYYY-MM-DD");
    if (req.query.date) date = req.query.date;
    let classeId = null;
    if (classe) classeId = new mongoose.Types.ObjectId(classe);
    const attendanceSheets = await AttendanceSheet.aggregate([
      {
        $lookup: {
          from: "sessions",
          localField: "session",
          foreignField: "_id",
          as: "session",
        },
      },
      { $unwind: "$session" },

      {
        $lookup: {
          from: "classes",
          localField: "session.classe",
          foreignField: "_id",
          as: "classe",
        },
      },
      { $unwind: "$classe" },
      {
        $match: {
          $expr: {
            $cond: {
              if: { $ne: [classeId, null] },
              then: {
                $and: [
                  { $eq: ["$classe._id", classeId] },
                  { $eq: ["$date", new Date(date)] },
                ],
              },
              else: {
                $eq: ["$date", new Date(date)],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "session.teacher",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: "$teacher" },
      {
        $lookup: {
          from: "levelsubjects",
          localField: "session.levelSubject",
          foreignField: "_id",
          as: "session.levelSubject",
        },
      },
      { $unwind: "$session.levelSubject" },
      {
        $lookup: {
          from: "subjects",
          localField: "session.levelSubject.subject",
          foreignField: "_id",
          as: "levelSubject.subject",
        },
      },
      { $unwind: "$levelSubject.subject" },

      { $unwind: "$attendances" },
      {
        $group: {
          _id: "$_id",
          A: { $sum: { $cond: [{ $eq: ["$attendances.status", "A"] }, 1, 0] } },
          R: { $sum: { $cond: [{ $eq: ["$attendances.status", "R"] }, 1, 0] } },
          P: { $sum: { $cond: [{ $eq: ["$attendances.status", "P"] }, 1, 0] } },
          E: { $sum: { $cond: [{ $eq: ["$attendances.status", "E"] }, 1, 0] } },
          startTime: { $first: "$session.startTime" },
          endTime: { $first: "$session.endTime" },
          validated: { $first: "$validated" },
          classe: { $first: "$classe.classeName" },
          subject: { $first: "$levelSubject.subject.subjectName" },
          date: { $first: "$date" },
          teacher: {
            $first: {
              $concat: ["$teacher.firstName", " ", "$teacher.lastName"],
            },
          },
        },
      },
      { $sort: { startTime: -1, A: -1, E: -1, R: -1 } },
    ]);
    return res.status(200).send(attendanceSheets);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get current session's attendance sheet for teacher
router.get("/teacher", async (req, res) => {
  try {
    const teacher = await User.findOne({
      email: req.session.user.email,
      // _id: req.params.id, //for testing purpose
      role: ROLES.TEACHER,
    });
    if (!teacher) return res.status(404).send("Teacher not found");

    const now = dayjs();
    const currentYear = await SchoolYear.findOne({ current: true });

    console.log("now", now)

    const session = await Session.findOne({
      day: now.day() - 1,
      teacher: teacher._id,
      startTime: { $lte: now.hour() },
      endTime: { $gt: now.hour() },
      week: { $in: [process.env.week, "both"] },
    })
      .populate({
        path: "classe",
        match: { schoolYear: currentYear._id },
      })
      .populate({ path: "levelSubject", populate: "subject" });
    if (!session) return res.status(410).send("Aucune séance");
    const classe = session.classe;
    let sheet = await AttendanceSheet.findOne({
      session: session._id,
      date: now.format("YYYY-MM-DD"),
    })
      .populate("attendances.student", "-password")
      .populate("session");

    if (!sheet) {
      const attendanceSheet = classe.students.map((student) => ({
        student,
        status: "P",
      }));
      const newSheet = new AttendanceSheet({
        date: now.format("YYYY-MM-DD"),
        attendances: attendanceSheet,
        schoolYear: currentYear._id,
        session: session._id,
      });

      sheet = await newSheet.save();
    }
    const subject = session.levelSubject.subject;

    const attendances = await AttendanceSheet.aggregate([
      {
        $match: {
          _id: sheet._id,
        },
      },
      {
        $unwind: "$attendances",
      },
      {
        $lookup: {
          from: "users",
          localField: "attendances.student",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $group: {
          _id: "$attendances._id",
          student: {
            $first: {
              _id: "$student._id",
              firstName: "$student.firstName",
              lastName: "$student.lastName",
            },
          },
          status: { $first: "$attendances.status" },
        },
      },
    ]);

    const sheetObject = {
      _id: sheet._id,
      subject: subject.subjectName,
      classe: classe.classeName,
      date: sheet.date,
      startTime: session.startTime,
      endTime: session.endTime,
      teacher: `${teacher.firstName} ${teacher.lastName}`,
      validated: sheet.validated,
      session: session._id,
      attendances: attendances,
    };

    return res.status(200).send(sheetObject);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get students' attendanes of today for tutor
router.get("/tutor", async (req, res) => {
  try {
    let assiduities = [];
    const tutor = await User.findOne({
      email: req.session.user.email,
      // _id: req.params.id,
      role: ROLES.TUTOR,
    });
    if (!tutor) return res.status(404).send("Tutor with given id not found");

    const students = await User.find({
      role: ROLES.STUDENT,
      "studentData.tutor": tutor._id,
      archived: false,
    }).select("-password");

    if (!students || students.length === 0) return res.status(200).send([]);
    const studentIds = students.map((student) => student._id);
    const formattedDate = new Date().toISOString().substring(0, 10);
    const studentsAbsences = await AttendanceSheet.aggregate([
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
          from: "users",
          localField: "session.teacher",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $unwind: "$teacher",
      },
      {
        $lookup: {
          from: "levelsubjects",
          localField: "session.levelSubject",
          foreignField: "_id",
          as: "levelSubject",
        },
      },
      {
        $unwind: "$levelSubject",
      },
      {
        $lookup: {
          from: "subjects",
          localField: "levelSubject.subject",
          foreignField: "_id",
          as: "subject",
        },
      },
      {
        $unwind: "$subject",
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
        $match: {
          date: new Date(formattedDate),
          "attendances.student": { $in: studentIds },
        },
      },
      {
        $unwind: "$attendances",
      },

      {
        $group: {
          _id: "$attendances.student",
          student: { $first: "$attendances.student" },
          classe: { $first: "$classe.classeName" },
          attendances: {
            $push: {
              $cond: {
                if: { $ne: ["$attendances.status", "P"] },
                then: {
                  status: "$attendances.status",
                  session: "$session._id",
                  startTime: "$session.startTime",
                  endTime: "$session.endTime",
                  day: "$session.day",
                  date: "$date",
                  teacher: {
                    $concat: ["$teacher.firstName", " ", "$teacher.lastName"],
                  },
                  subject: "$subject.subjectName",
                },
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $project: {
          _id: 0,
          student: {
            $concat: ["$student.firstName", " ", "$student.lastName"],
          },
          studentId: "$student._id",
          classe: 1,
          attendances: 1,
          teacher: 1,
        },
      },
    ]);

    if (studentsAbsences.length < studentIds.length) {
      const studentsPresentIds = studentsAbsences.map((absence) =>
        absence.studentId.toString()
      );
      const studentsIdsNotInAbsences = studentIds.filter(
        (studentId) => !studentsPresentIds.includes(studentId.toString())
      );

      const studentClasse = await User.aggregate([
        {
          $match: {
            _id: { $in: studentsIdsNotInAbsences },
          },
        },
        {
          $lookup: {
            from: "classes",
            localField: "_id",
            foreignField: "students",
            as: "classe",
          },
        },
        {
          $unwind: { path: "$classe", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 0,
            student: { $concat: ["$firstName", " ", "$lastName"] },
            studentId: "$_id",
            classe: {
              $ifNull: ["$classe.classeName", "Non assigné"],
            },

            attendances: [],
          },
        },
      ]);
      studentsAbsences.push(...studentClasse);
    }

    const studentsSanctions = await User.aggregate([
      {
        $match: {
          _id: { $in: studentIds },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "students",
          as: "classe",
        },
      },
      {
        $unwind: "$classe",
      },
      {
        $lookup: {
          from: "sanctions",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$student", "$$studentId"] },
                    {
                      $eq: [
                        {
                          $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$date",
                          },
                        },
                        formattedDate,
                      ],
                    },
                  ],
                },
              },
            },

            {
              $lookup: {
                from: "users",
                localField: "sanctionIssuer",
                foreignField: "_id",
                as: "sanctionIssuer",
              },
            },
            {
              $unwind: "$sanctionIssuer",
            },
            {
              $project: {
                _id: 0,
                date: "$date",
                type: "$type",
                description: "$description",
                sanctionIssuer: {
                  $concat: [
                    "$sanctionIssuer.firstName",
                    " ",
                    "$sanctionIssuer.lastName",
                  ],
                },
              },
            },
          ],
          as: "sanctions",
        },
      },
      {
        $project: {
          _id: 0,
          student: { $concat: ["$firstName", " ", "$lastName"] },
          studentId: "$_id",
          classe: "$classe.classeName",
          sanctions: {
            $cond: [{ $eq: [{ $size: "$sanctions" }, 0] }, [], "$sanctions"],
          },
        },
      },
    ]);

    for (const studentId of studentIds) {
      const sanctions = studentsSanctions.find(
        (item) => item.studentId.toString() === studentId.toString()
      );
      const attendances = studentsAbsences.find(
        (item) => item.studentId.toString() === studentId.toString()
      );

      const assiduity = {
        studentId: studentId,
        student: attendances?.student,
        classe: attendances?.classe,
        sanctions: sanctions ? sanctions.sanctions : [],
        attendances: attendances ? attendances.attendances : [],
      };

      assiduities.push(assiduity);
    }

    return res.status(200).send(assiduities);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const attendanceSchema = Joi.object({
      student: Joi.string().required(),
      status: Joi.string().valid("A", "R", "P", "E").required(),
    });
    const schema = Joi.object({
      session: Joi.string(),
      date: Joi.date(),
      schoolYear: Joi.string(),
      attendances: Joi.array().items(attendanceSchema),
      validated: Joi.boolean(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const UpdatedAttendanceSheet = await AttendanceSheet.findByIdAndUpdate(
      req.params.id,
      { attendances: req.body.attendances, validated: true },
      { new: true }
    ).populate("attendances.student");
    res.status(200).send(UpdatedAttendanceSheet);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/notify-by-mail", async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.body.studentId,
      role: ROLES.STUDENT,
    });
    if (!student)
      return res.status(400).send("Student with given id not found");

    const tutor = await User.findById(student.studentData.tutor);
    if (!tutor) return res.status(400).send("Tutor not found");

    const attendanceSheet = await AttendanceSheet.findById(
      req.body.attendanceSheet
    )
      .populate({
        path: "session",
        populate: {
          path: "classe",
        },
      })
      .populate({
        path: "session",
        populate: {
          path: "levelSubject",
          populate: {
            path: "subject",
          },
        },
      });

    let studentStatus;

    attendanceSheet.attendances.map((attendance) => {
      if (attendance.student.toString() === req.body.studentId) {
        studentStatus = attendance.status;
      }
    });

    const statusMapping = {
      R: "en retard",
      A: "absent",
      E: "exclu",
      P: "présent",
    };

    const status = statusMapping[studentStatus];

    if (!attendanceSheet)
      return res.status(400).send("Attendance sheet not found");

    const civility = tutor.gender === "male" ? "monsieur" : "madame";

    sendAbsenceEmail(
      tutor.email,
      "Notification d'assiduité de votre enfant",
      civility,
      tutor.firstName,
      tutor.lastName,
      student.firstName,
      student.lastName,
      status,
      attendanceSheet.session.levelSubject.subject.subjectName,
      attendanceSheet.session.classe.classeName,
      dayjs(attendanceSheet.date).format("YYYY-MM-DD"),
      attendanceSheet.session.startTime,
      attendanceSheet.session.endTime
    );

    return res.status(200).send("Email envoyé");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/notify-by-sms", async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.body.studentId,
      role: ROLES.STUDENT,
    });
    if (!student)
      return res.status(400).send("Student with given id not found");
    const tutor = await User.findById(student.studentData.tutor);
    if (!tutor) return res.status(400).send("Tutor not found");
    const attendanceSheet = await AttendanceSheet.findById(
      req.body.attendanceSheet
    )
      .populate({
        path: "session",
        populate: {
          path: "classe",
        },
      })
      .populate({
        path: "session",
        populate: {
          path: "levelSubject",
          populate: {
            path: "subject",
          },
        },
      });
    let studentStatus;

    attendanceSheet.attendances.map((attendance) => {
      if (attendance.student.toString() === req.body.studentId) {
        studentStatus = attendance.status;
      }
    });
    const statusMapping = {
      R: "en retard",
      A: "absent",
      E: "exclu",
      P: "présent",
    };

    const status = statusMapping[studentStatus];
    if (!attendanceSheet)
      return res.status(400).send("Attendance sheet not found");

    const civility = tutor.gender === "male" ? "monsieur" : "madame";

    const message = `Bonjour ${civility} ${tutor.firstName} ${tutor.lastName}, 
        Nous tenons à vous informer que votre enfant ${student.firstName} ${student.lastName
      } inscrit dans la classe
        ${attendanceSheet.session.classe.classeName
      }, a été ${status} de la séance ${attendanceSheet.session.levelSubject.subject.subjectName
      } qui s'est déroulée le ${dayjs(attendanceSheet.date).format(
        "YYYY-MM-DD"
      )} de ${attendanceSheet.session.startTime}h à
        ${attendanceSheet.session.endTime}h.   
    Essor Education.`;
    // return sendSms("message", "+216" + tutor.phoneNumber);

    sendSms(message, "+21655656960");
    return res.status(200).send("SMS envoyé");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.put("/:id/invalidate", async (req, res) => {
  try {
    let attendanceSheet = await AttendanceSheet.findByIdAndUpdate(
      req.params.id,
      {
        validated: false,
      },
      { new: true }
    ).populate("attendances.student");
    if (!attendanceSheet)
      return res.status(400).send("Attendance sheet with given id not found ");

    res.status(200).send(attendanceSheet);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

router.post("/teacher", async (req, res) => {
  try {
    const schema = Joi.object({
      student: Joi.string().required(),
      type: Joi.string().required(),
      description: Joi.string().allow(""),
      session: Joi.string().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const teacher = User.findOne({
      email: req.session.user.email,
      // _id: req.params.teacherId,
      role: ROLES.TEACHER,
    }).select("-password");
    if (!teacher)
      return res.status(404).send("Teacher with given id not found");
    const student = User.findOne({
      _id: req.body.student,
      role: ROLES.STUDENT,
    }).select("-password");
    if (!student)
      return res.status(404).send("Student with given id not found");
    const session = await Session.findById(req.body.session);
    if (!session) return res.status(404).send([]);
    const now = dayjs();
    let attendanceSheet = await AttendanceSheet.findOne({
      session: session._id,
      date: now.format("YYYY-MM-DD"),
    })
      .populate("attendances.student", "-password")
      .populate("session");
    const result = await attendanceSheet.save();
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
