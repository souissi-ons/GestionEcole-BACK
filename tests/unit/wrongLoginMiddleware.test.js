// __tests__/unit/wrongLoginMiddleware.test.js

const wrongLoginMiddleware = require("../../middlewares/WrongLogin");
const { User } = require("../../models/user");
const { RestrictedIP } = require("../../models/restrictedIp");

// --- Simulation complète des modèles ---
jest.mock("../../models/user", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../models/restrictedIp", () => ({
  RestrictedIP: {
    findOne: jest.fn(),
    create: jest.fn(),
    // On simule aussi .save() sur l'instance retournée
    prototype: {
      save: jest.fn(),
    },
  },
}));

// --- Groupe de Tests ---
describe("Tests Unitaires : wrongLoginMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Réinitialiser tous les mocks avant chaque test
    jest.clearAllMocks();

    // Mocks standards
    req = {
      body: {
        emailOrNumber: "test@example.com",
        password: "Password123",
      },
      ip: "127.0.0.1",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();

    // Comportement par défaut des mocks (aucun IP bloquée)
    RestrictedIP.findOne.mockResolvedValue(null);
  });

  // --- Cas 1: Succès ---
  it("devrait appeler next() si l'utilisateur est trouvé et non archivé", async () => {
    const mockUser = { _id: "123", email: "test@example.com", archived: false };
    User.findOne.mockResolvedValue(mockUser);

    await wrongLoginMiddleware(req, res, next);

    expect(User.findOne).toHaveBeenCalled();
    expect(req.user).toBe(mockUser); // Vérifie que l'utilisateur est attaché
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // --- Cas 2: Échec - Utilisateur archivé ---
  it("devrait renvoyer 401 si l'utilisateur est archivé", async () => {
    const mockUser = { _id: "123", email: "test@example.com", archived: true };
    User.findOne.mockResolvedValue(mockUser);

    await wrongLoginMiddleware(req, res, next);

    expect(User.findOne).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Account suspended.");
  });

  // --- Cas 3: Échec - Utilisateur inconnu (1ère tentative) ---
  it("devrait renvoyer 400 et créer une entrée IP si utilisateur inconnu (1ère fois)", async () => {
    User.findOne.mockResolvedValue(null); // Utilisateur non trouvé
    RestrictedIP.findOne.mockResolvedValue(null); // IP non trouvée
    RestrictedIP.create.mockResolvedValue({ attempts: 1 }); // Simule la création

    await wrongLoginMiddleware(req, res, next);

    expect(User.findOne).toHaveBeenCalled();
    expect(RestrictedIP.findOne).toHaveBeenCalledWith({
      ipAddress: "127.0.0.1",
    });
    expect(RestrictedIP.create).toHaveBeenCalled(); // Doit créer l'entrée
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("Tentatives restantes 2")
    );
  });

  // --- Cas 4: Échec - Utilisateur inconnu (2ème tentative) ---
  it("devrait renvoyer 400 et incrémenter l'entrée IP (2ème fois)", async () => {
    User.findOne.mockResolvedValue(null);
    // Simule une IP déjà trouvée avec 1 tentative
    const mockIp = { ipAddress: "127.0.0.1", attempts: 1, save: jest.fn() };
    RestrictedIP.findOne.mockResolvedValue(mockIp);

    await wrongLoginMiddleware(req, res, next);

    expect(User.findOne).toHaveBeenCalled();
    expect(RestrictedIP.findOne).toHaveBeenCalled();
    expect(mockIp.attempts).toBe(2); // Vérifie l'incrémentation
    expect(mockIp.save).toHaveBeenCalled(); // Doit sauvegarder
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("Tentatives restantes 1")
    );
  });

  // --- Cas 5: Échec - IP déjà bloquée (3 tentatives) ---
  it("devrait renvoyer 400 'Vous êtes bloqué' si l'IP a >= 3 tentatives", async () => {
    const mockIp = { ipAddress: "127.0.0.1", attempts: 3 };
    RestrictedIP.findOne.mockResolvedValue(mockIp);

    // Note: req.body.password est valide, mais l'IP est bloquée
    await wrongLoginMiddleware(req, res, next);

    // Ne doit MÊME PAS chercher l'utilisateur
    expect(User.findOne).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Vous êtes bloqué !");
  });

  // --- Cas 6: Échec - Validation Joi (mot de passe manquant) ---
  it("devrait renvoyer 400 'Vous êtes bloqué' si la validation Joi échoue", async () => {
    req.body.password = undefined; // Fait échouer la validation
    // L'IP n'est pas bloquée
    RestrictedIP.findOne.mockResolvedValue(null);

    await wrongLoginMiddleware(req, res, next);

    expect(RestrictedIP.findOne).toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled(); // Bloqué avant la recherche BDD
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Vous êtes bloqué !");
  });
});
