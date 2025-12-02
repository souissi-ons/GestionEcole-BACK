// __tests__/unit/adminMiddleware.test.js

const adminMiddleware = require("../../middlewares/admin");
const { ROLES } = require("../../models/user"); // !! Ajustez le chemin !!

describe("Tests Unitaires : adminMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: {} };
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  it("devrait appeler next() si le rôle de l'utilisateur est Admin", () => {
    req.user.role = ROLES.ADMIN;
    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("devrait renvoyer 403 si le rôle de l'utilisateur n'est pas Admin (ex: Tuteur)", () => {
    req.user.role = ROLES.TUTOR;
    adminMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Access forbidden.");
  });

  it("devrait renvoyer 403 si le rôle de l'utilisateur est Enseignant", () => {
    req.user.role = ROLES.TEACHER;
    adminMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Access forbidden.");
  });

  it("devrait renvoyer 403 si req.user est undefined", () => {
    req.user = undefined;
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Access forbidden.");
    expect(next).not.toHaveBeenCalled();
  });
});
