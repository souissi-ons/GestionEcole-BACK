const users = require("../routes/users");
const auth = require("../routes/auth");
const images = require("../routes/images");
const uploads = require("../routes/uploads");
const schoolYears = require("../routes/schoolYears");
const rooms = require("../routes/rooms");
const classes = require("../routes/classes");
const levels = require("../routes/levels");
const subjects = require("../routes/subjects");
const courses = require("../routes/courses");
const levelSubjects = require("../routes/levelSubjects");
const sessions = require("../routes/sessions");
const exams = require("../routes/exams");
const sanctions = require("../routes/sanctions");
const news = require("../routes/news");
const attendanceSheets = require("../routes/attendanceSheets");
const chatGroups = require("../routes/chatGroups");
const privateChats = require("../routes/privateChats");
const passwordReset = require("../routes/passwordReset");
const settings = require("../routes/settings");
const dashboards = require("../routes/dashboards");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

module.exports = function (app) {
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://192.168.1.15:3000"],
      credentials: true,
    })
  );

  app.use("/api/users", users);
  app.use("/api/auth", auth);
  app.use("/api/images", images);
  app.use("/api/uploads", uploads);
  app.use("/api/schoolYears", schoolYears);
  app.use("/api/subjects", subjects);
  app.use("/api/classes", classes);
  app.use("/api/levels", levels);
  app.use("/api/courses", courses);
  app.use("/api/level-subjects", levelSubjects);
  app.use("/api/rooms", rooms);
  app.use("/api/sessions", sessions);
  app.use("/api/exams", exams);
  app.use("/api/attendance-sheets", attendanceSheets);
  app.use("/api/sanctions", sanctions);
  app.use("/api/news", news);
  app.use("/api/chat-group", chatGroups);
  app.use("/api/private-chat", privateChats);
  app.use("/api/password-reset", passwordReset);
  app.use("/api/settings", settings);
  app.use("/api/dashboards", dashboards);
};
