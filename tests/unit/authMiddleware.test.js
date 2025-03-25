const auth = require("../../middlewares/auth");
const { User } = require("../../models/user");
let server;

describe("auth middleware", () => {
  beforeEach(async () => {
    server = require("../../index");
    await User.deleteMany({});
    await User.insertMany([
      {
        identifier: "09640062",
        password: "123456",
        archived: false,
        firstName: "Ons",
        lastName: "Souissi",
        email: "souissi@gmail.com",
        role: "teacher",
        address: {
          street: "Rades",
          city: "Rades",
          postalCode: "2040",
        },
        gender: "Femelle",
        phoneNumber: "54887334",
      },
    ]);
  });
  afterEach(async () => {
    server.close();
  });
  it("should call next if user is logged in", async () => {
    const session = {
      email: "souissi@gmail.com",
    };

    // Call the protected route with the session
    const req = { session };
    let res = { send: jest.fn() };
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
  });
  it("should return 401 status if user is not logged in", async () => {
    const req = { session: {} };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Access denied. Not authenticated.");
  });
});
