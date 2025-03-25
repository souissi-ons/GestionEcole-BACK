const { User, validateUser, ROLES } = require("../models/user");
const { Classe } = require("../models/classe");
const { upload } = require("../middlewares/upload");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");
const checkAdultContentMiddleware = require("../middlewares/checkAdultContent");
const validatePhoneNumberMiddleware = require("../middlewares/checkPhoneNumber");
const checkPhoneNumber = require("../middlewares/checkPhoneNumber");
const { sendNewPasswordEmail } = require("../utils/sendEmail");
const _ = require("lodash");
const router = require("express").Router();
const generator = require("generate-password");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const path = require("path");
const { Course } = require("../models/course");
const { Session } = require("../models/session");
const fs = require("fs").promises;

// Check if the number can be used
router.post(
  "/check-number",
  [authMiddleware, adminMiddleware, checkPhoneNumber],
  (req, res) => {
    return res.status(200).send("");
  }
);

// Check if the email can be used
router.post("/check-email", async (req, res) => {
  try {
    let user = await User.findOne({
      email: req.body.email.replace(/\s+/g, ""),
    }).select("email");
    if (user) return res.status(409).send("email already exists.");
    return res.status(200).send("");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Check if the identifier can be used
router.post("/check-identifier", async (req, res) => {
  try {
    let user = await User.findOne({
      identifier: req.body.identifier.replace(/\s+/g, ""),
    }).select("identifier");
    if (user) return res.status(409).send("identifier already exists.");
    return res.status(200).send("");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Create new user
router.post(
  "/",
  [authMiddleware, adminMiddleware, validatePhoneNumberMiddleware],
  async (req, res) => {
    try {
      const { error } = validateUser(req.body);
      if (error) return res.status(400).send(error.details[0].message);
      let user = await User.findOne({ email: req.body.email.toLowerCase() });
      if (user) return res.status(400).send("Email is already used");

      const userObject = _.pick(req.body, [
        "identifier",
        "firstName",
        "lastName",
        "email",
        "role",
        "studentData",
        "gender",
        "birthDate",
        "phoneNumber",
        "address",
        "identifier",
        "speciality",
        "workload",
      ]);
      userObject.password = generator.generate({
        length: 10,
        numbers: true,
      });
      if (userObject.role === ROLES.STUDENT) {
        // Find the highest existing identifier value and increment it by 1
        highestIdentifier = await User.findOne({ role: ROLES.STUDENT })
          .sort("-identifier")
          .select("identifier");
        userObject.identifier = highestIdentifier
          ? parseInt(highestIdentifier.identifier) + 1
          : 100000;
      }
      user = new User(userObject);
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      const link = `${process.env.BASE_URL}/login`;
      let civility = "";
      if (user.role !== ROLES.STUDENT) {
        if (user.gender === "male") civility = "monsieur";
        else civility = "madame";
      }
      sendNewPasswordEmail(
        userObject.email,
        "Mot de passe",
        link,
        civility,
        userObject.firstName,
        userObject.lastName,
        userObject.password
      );

      await user.save();
      res.status(200).send();
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Get all non-archived users
router.get("/", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({ archived: false });
    res.send(users);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all archived users
router.get("/archived", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({ archived: true });
    res.send(users);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
// Get all locked users
router.get("/locked", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({ locked: true });
    res.send(users);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
// put all archived users
router.get("/lock/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { locked: req.body.locked },
      { new: true }
    );
    if (!user) return res.status(400).send("Utilisateur introuvable");
    res.send(user);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all non-archived students of a particular level
router.get(
  "/level/:levelId",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const users = await User.find({
        role: ROLES.STUDENT,
        archived: false,
        "studentData.level": req.params.levelId,
      }).select("-password");
      res.send(users);
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Get all non-archived students not currently assigned to a class of a particular level and school year
router.get("/:levelId/:schoolYearId/students", async (req, res) => {
  try {
    const levelId = req.params.levelId;
    const schoolYearId = req.params.schoolYearId;
    const students = await User.find({
      "studentData.level": levelId,
      archived: false,
      _id: {
        $nin: await Classe.find({
          level: levelId,
          schoolYear: schoolYearId,
        }).then((classes) => classes.flatMap((c) => c.students)),
      },
    });
    res.send(students);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all non-archived students
router.get("/students", [authMiddleware], async (req, res) => {
  try {
    const students = await User.find({ role: ROLES.STUDENT, archived: false })
      .populate("studentData.tutor", "-password")
      .populate("studentData.level")
      .select("-password");
    res.send(students);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all non-archived tutors
router.get("/tutors", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({
      role: ROLES.TUTOR,
      archived: false,
    }).select("-password");
    res.send(users);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all non archived teachers
router.get("/teachers", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({
      role: ROLES.TEACHER,
      archived: false,
    }).select("-password");
    res.send(users);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all non-archived students assigned to a particular tutor
router.get(
  "/:tutorId/students",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { tutorId } = req.params;
      const tutor = await User.find({ _id: tutorId, role: ROLES.TUTOR }).select(
        "-password"
      );
      if (!tutor) return res.status(404).send("Tutor with given id not found");
      const students = await User.find({
        role: ROLES.STUDENT,
        "studentData.tutor": tutorId,
        archived: false,
      }).select("-password");
      res.send(students);
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

router.post("/check-password", [authMiddleware], async (req, res) => {
  try {
    const valid = await bcrypt.compare(req.body.password, req.user.password);
    if (valid) return res.sendStatus(200);
    return res.sendStatus(400);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get a particular user
router.get("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findById({ _id: req.params.id }).select(
      "-password"
    );
    if (!user) res.status(400).send("User with given id not found");
    res.send(user);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Change avatar
router.put(
  "/change-avatar",
  [authMiddleware, upload.single("avatar"), checkAdultContentMiddleware],
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.session.user.email });
      if (!user) {
        await fs.unlink(req.file.path);
        return res.status(404).send("User not found");
      }
      // Update the user's profile picture with the uploaded file information
      user.avatar = req.file.filename;
      // Save the updated user to the database
      await user.save();
      res.status(200).send({ avatar: user.avatar });
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Change password
router.put("/change-password", [authMiddleware], async (req, res) => {
  try {
    const schema = Joi.object({
      currentPassword: Joi.string().min(6).required(),
      password: Joi.string().min(6).required(),
      confirmPassword: Joi.string()
        .min(6)
        .valid(Joi.ref("password"))
        .required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) return res.status(400).send("User not found ");
    const isValidPassword = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );
    if (!isValidPassword)
      return res.status(400).send("Current password is invalid");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    user.password = hashedPassword;
    await user.save();

    res.send("Password has been successfully changed");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update user account
router.put("/:id", async (req, res) => {
  try {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let user = await User.findById({ _id: req.params.id });
    if (!user) return res.status(400).send("User with given id not found ");
    const userObject = _.pick(req.body, [
      "identifier",
      "firstName",
      "lastName",
      "email",
      "role",
      "studentData",
      "gender",
      "birthDate",
      "phoneNumber",
      "address",
      "identifier",
      "speciality",
      "workload",
    ]);
    user = await User.findByIdAndUpdate(req.params.id, userObject);
    res.status(200).send("User has been successfully updated");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update status of a particular user
router.put(
  "/:id/change-status",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const schema = Joi.object({
        archived: Joi.boolean().required(),
      });
      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);
      const user = await User.findById({ _id: req.params.id });
      if (!user) return res.status(400).send("User with given id not found ");
      user.archived = req.body.archived;
      await user.save();
      res.status(200).send("Status has been successfully changed");
    } catch (error) {
      res.status(500).send(`Internal server error: ${error.message}`);
    }
  }
);

// Update status of a particular user
router.put("/:id/lock", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const schema = Joi.object({
      locked: Joi.boolean().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findByIdAndUpdate(req.params.id, {
      locked: req.body.locked,
    });
    if (!user) return res.status(400).send("User with given id not found ");

    await user.save();
    res.status(200).send("Status has been successfully changed");
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete user account
// router.delete("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
//   try {
//     const user = await User.findById({ _id: req.params.id });
//     if (!user) return res.status(400).send("User with given id not found");
//     if (user.role === ROLES.TEACHER) {
//       await Course.deleteMany({ teacher: res.params.id });
//       await Session.deleteMany({ teacher: req.params.id });
//     } else if (user.role === ROLES.STUDENT) {
//       await Classe.updateMany(
//         { students: { $in: [req.params.id] } },
//         { $pull: { students: req.params.id } }
//       );
//     } else if (user.role === ROLES.TUTOR) {
//       const student = await User.find({
//         role: ROLES.STUDENT,
//         tutor: req.params.id,
//       });
//       if (student)
//         return res.status(409).send("Il y a déjà un élève lié à ce tuteur ");
//     }
//     await User.findByIdAndRemove({ _id: req.params.id });
//     res.send(user);
//   } catch (error) {
//     res.status(500).send(`Internal server error: ${error.message}`);
//   }
// });

module.exports = router;
