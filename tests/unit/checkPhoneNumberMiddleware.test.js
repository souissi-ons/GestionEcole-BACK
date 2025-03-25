const { ROLES } = require("../../../front/src/data/constants");
const checkPhoneNumber = require("../../middlewares/checkPhoneNumber");
const { User } = require("../../models/user");
let server;

describe("checkPhoneNumber middleware", () => {
  beforeEach(async () => {
    server = require("../../index");
  });

  afterEach(async () => {
    server.close();
  });

  it("should return 400 status if not phoneNumber and it's not student", async () => {
    const req = { body: { role: ROLES.TUTOR, email: "souissi@gmail.com" } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await checkPhoneNumber(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Phone number is required");
  });

  it("should call next if not phoneNumber and it's student", async () => {
    const req = { body: { role: ROLES.STUDENT, email: "souissi@gmail.com" } };
    const res = { send: jest.fn() };
    const next = jest.fn();

    await checkPhoneNumber(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should return 400 status if phoneNumber already exists", async () => {
    const existingUser = {
      identifier: "02545678",
      password: "123456",
      archived: true,
      firstName: "Ayoub",
      lastName: "Rais",
      email: "ayoubrais@gmail.com",
      role: ROLES.TUTOR,
      address: {
        street: "Ouardeyya",
        city: "Ouardeyya",
        postalCode: "2000",
      },
      gender: "Male",
      phoneNumber: "90 565 961",
    };

    await User.create(existingUser);

    const req = {
      body: {
        role: ROLES.TUTOR,
        email: "souissi@gmail.com",
        phoneNumber: existingUser.phoneNumber,
      },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await checkPhoneNumber(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Phone number is already used");
  });

  it("should call next if phoneNumber is valid and not already used", async () => {
    const req = {
      body: {
        role: ROLES.TUTOR,
        email: "onssouissi@gmail.com",
        phoneNumber: "97 565 961",
      },
    };
    const res = { send: jest.fn() };
    const next = jest.fn();

    await checkPhoneNumber(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
