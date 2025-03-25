const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

const sendEmail = (to, subject, html) => {
  const transport = nodemailer.createTransport({
    host: process.env.HOST,
    service: process.env.SERVICE,
    port: 587,
    secure: true,
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASS,
    },
  });

  const message = {
    from: process.env.MAILER_USER,
    to: to,
    subject: subject,
    html: html,
  };

  transport.sendMail(message, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

// Pour envoyer un email lors de la création d'un utilisateur
const sendNewPasswordEmail = (
  to,
  subject,
  link,
  civility,
  firstName,
  lastName,
  password
) => {
  const filePath = path.join(__dirname, "../views/newPasswordEmail.handlebars");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const template = handlebars.compile(data);
      const html = template({
        link,
        civility,
        firstName,
        lastName,
        password,
      });
      sendEmail(to, subject, html);
    }
  });
};

// Pour envoyer un email lors de la réinitialisation de mot de passe
const sendResetPasswordEmail = (
  to,
  subject,
  link,
  civility,
  firstName,
  lastName
) => {
  const filePath = path.join(
    __dirname,
    "../views/resetPasswordEmail.handlebars"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const template = handlebars.compile(data);
      const html = template({ link, civility, firstName, lastName });
      sendEmail(to, subject, html);
    }
  });
};

// Pour envoyer un email pour le suivi d'assiduité
const sendAbsenceEmail = (
  to,
  subject,
  civility,
  tutorFirstName,
  tutorLastName,
  studentFirstName,
  studentLastName,
  status,
  session,
  classe,
  date,
  startTime,
  endTime
) => {
  const filePath = path.join(__dirname, "../views/absenceEmail.handlebars");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const template = handlebars.compile(data);
      const html = template({
        civility,
        tutorFirstName,
        tutorLastName,
        studentFirstName,
        studentLastName,
        status,
        session,
        classe,
        date,
        startTime,
        endTime,
      });
      sendEmail(to, subject, html);
    }
  });
};

exports.sendNewPasswordEmail = sendNewPasswordEmail;
exports.sendResetPasswordEmail = sendResetPasswordEmail;
exports.sendAbsenceEmail = sendAbsenceEmail;
