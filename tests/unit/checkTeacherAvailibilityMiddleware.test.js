const checkTeacherAvailability = require("../../middlewares/checkTeacherAvailability");
const { Session } = require("../../models/session");

let server;

describe("checkTeacherAvailability middleware", () => {
  beforeEach(async () => {
    server = require("../../index");
    await Session.deleteMany({});
    await Session.insertMany([
      {
        week: "both",
        day: 0,
        classe: "644e9f79e691173004c81a9e",
        group: "1",
        startTime: 10,
        endTime: 12,
        subject: "6440914eb8ac4c68307e5568",
        teacher: "6428376a11eef8aaff8c780b",
        room: "643f6bdf404c3073af27cee0",
      },
    ]);
  });

  afterEach(async () => {
    server.close();
  });

  it("should allow the reservation if there are no conflicts", async () => {
    const req = {
      body: {
        week: "both",
        day: 5,
        classe: "644e9f79e691173004c81a9e",
        group: "1",
        startTime: 8,
        endTime: 9,
        subject: "6440914eb8ac4c68307e5568",
        teacher: "6428376a11eef8aaff8c780b",
        room: "643f6bdf404c3073af27cee1",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();

    await checkTeacherAvailability(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should return a 409 error if the teacher is already reserved", async () => {
    const req = {
      body: {
        week: "both",
        day: 0,
        classe: "644e9f79e691173004c81a9e",
        group: "1",
        startTime: 10,
        endTime: 12,
        subject: "6440914eb8ac4c68307e5568",
        teacher: "6428376a11eef8aaff8c780b",
        room: "643f6bdf404c3073af27cee1",
      },
      method: "POST",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();

    await checkTeacherAvailability(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith(
      "L'enseignant a déjà une séance pendant cet intervalle de temps.Enseigne la classe 8B1·\n  de 10h à 12h."
    );
    expect(next).not.toHaveBeenCalled();
  });
});
