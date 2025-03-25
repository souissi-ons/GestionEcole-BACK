const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const ROLES = {
  ADMIN: "Admin",
  TUTOR: "Tuteur",
  STUDENT: "Elève",
  TEACHER: "Enseignant",
};

// const year = 365 * 24 * 60 * 60 * 1000;

const userSchema = mongoose.Schema({
  identifier: {
    type: String,
    minlength: 5,
    maxlength: 255,
    unique: true,
    default: 100000,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 15,
  },
  lastName: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 15,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 10,
    maxlength: 255,
    lowercase: true,
  },
  password: {
    type: String,
    default: null,
    minlength: 5,
    maxlength: 255,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  address: {
    type: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
    },
  },
  phoneNumber: {
    type: String,
    trim: true,
    required: function () {
      return this.role === ROLES.TUTOR || this.role === ROLES.TEACHER;
    },
    set: function (v) {
      return v.replace(/\s+/g, "");
    },
  },

  archived: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    required: true,
  },
  birthDate: {
    type: Date,
    // required: true
  },
  speciality: {
    type: String,
    required: function () {
      return this.role === ROLES.TEACHER;
    },
  },
  workload: {
    type: Number,
    required: function () {
      return this.role === ROLES.TEACHER;
    },
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  locked: {
    type: Boolean,
    default: false,
  },
  studentData: {
    type: {
      tutor: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: function () {
          return this.role === ROLES.STUDENT;
        },
      },
      level: {
        type: mongoose.Types.ObjectId,
        ref: "Level",
        required: function () {
          return this.role === ROLES.STUDENT;
        },
      },
    },
    required: function () {
      return this.role === ROLES.STUDENT;
    },
  },
});

function validateUser(user) {
  const schema = Joi.object({
    identifier: Joi.string().when("role", {
      is: Joi.string().valid(ROLES.TUTOR, ROLES.TEACHER),
      then: Joi.string()
        .required()
        .regex(/^\d{8}$/),
    }),
    firstName: Joi.string().min(3).max(15).required(),
    lastName: Joi.string().min(3).max(15).required(),
    email: Joi.string().email().min(10).max(255).required(),
    role: Joi.string().required(),
    phoneNumber: Joi.string()
      .trim()
      .when("role", {
        is: Joi.equal(ROLES.TUTOR, ROLES.TEACHER),
        then: Joi.string().trim().required(),
        otherwise: Joi.string().allow("").optional(),
        // .regex(/^\d{2}\s\d{3}\s\d{3}$/),
      }),
    gender: Joi.string().required(),
    birthDate: Joi.date().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      postalCode: Joi.string().required(),
    }).required(),
    studentData: Joi.alternatives().conditional("role", {
      is: ROLES.STUDENT,
      then: Joi.object({
        tutor: Joi.string().required(),
        level: Joi.string().required(),
      }),
      otherwise: Joi.forbidden(),
    }),
    speciality: Joi.alternatives().conditional("role", {
      is: ROLES.TEACHER,
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    workload: Joi.alternatives().conditional("role", {
      is: ROLES.TEACHER,
      then: Joi.number().required(),
      otherwise: Joi.forbidden(),
    }),
  });
  return schema.validate(user);
}

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
    },
    process.env.JWT_KEY
  );
  return token;
};

const User = mongoose.model("User", userSchema);

exports.User = User;
exports.validateUser = validateUser;
exports.ROLES = ROLES;
