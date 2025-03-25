require("dotenv").config();

const sendSms = (message, to) => {
  const client = require("twilio")(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  client.messages
    .create({
      body: message,
      from: process.env.PHONE_NUMBER,
      to: to,
    })
    .then((message) => console.log(message.sid));
};

exports.sendSms = sendSms;
