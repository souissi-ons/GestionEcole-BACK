const { sendAbsenceEmail } = require("../../utils/sendEmail");
const nodemailer = require("nodemailer");
const fs = require("fs");
jest.mock("nodemailer");
jest.mock("fs");
describe("sendAbsenceEmail", () => {
  it("should sends absence email with correct data", () => {
    // Mocked data
    const to = "souissi.ons.54@gmail.com";
    const subject = "Absence Notification";
    const civility = "Mr";
    const tutorFirstName = "Ayoub";
    const tutorLastName = "Rais";
    const studentFirstName = "Ons";
    const studentLastName = "Souissi";
    const status = "Absent";
    const session = "Mathematics";
    const classe = "9B1";
    const date = "2023-06-09";
    const startTime = "09";
    const endTime = "10";
    const htmlTemplate = "<html><body>Mocked email content</body></html>";
    // Mock the fs.readFile function to return the mocked template data
    fs.readFile.mockImplementation((filePath, encoding, callback) => {
      callback(null, htmlTemplate);
    });
    // Mock the createTransport method to return a mocked transport object
    const sendMailMock = jest.fn((message, callback) => {
      callback(null, "Email sent");
    });
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });
    // Call the sendAbsenceEmail function
    sendAbsenceEmail(
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
    );
    // Assert that fs.readFile is called with the correct file path
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining("absenceEmail.handlebars"),
      "utf8",
      expect.any(Function)
    );
    // Assert that nodemailer.createTransport is called with the correct options
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: 587,
      secure: true,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    });
    // Assert that the sendMail function is called with the correct message data
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: process.env.MAILER_USER,
        to,
        subject,
        html: htmlTemplate,
      }),
      expect.any(Function)
    );
  });
});
