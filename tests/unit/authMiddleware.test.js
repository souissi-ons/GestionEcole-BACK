const authMiddleware = require("../../middlewares/auth");
const { User } = require("../../models/user");

jest.mock("../../models/user", () => ({
  User: {
    findOne: jest.fn(),
  },
}));
describe("Auth Middleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    User.findOne.mockClear();

    // Simulation de l'objet req (requête)
    req = {
      session: {
        // La session est définie par défaut, mais peut être écrasée par les tests
        user: { email: "test@example.com" },
      },
    };

    // Simulation de l'objet res (réponse)
    res = {
      status: jest.fn(() => res), // Permet le chaînage status().send()
      send: jest.fn(),
    };

    // Simulation de la fonction next (middleware suivant)
    next = jest.fn();
  });

  // --- Cas 1: Succès ---
  it("devrait appeler next() et attacher user si session valide et utilisateur trouvé", async () => {
    const mockUser = { _id: "123", email: "test@example.com", archived: false };
    User.findOne.mockResolvedValue(mockUser);

    await authMiddleware(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(req.user).toBeDefined();
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // Appelé sans argument d'erreur
    expect(res.status).not.toHaveBeenCalled();
  });

  // --- Cas 2: Échec - req.session n'existe pas ---
  it("devrait renvoyer 401 si req.session n'existe pas", async () => {
    req.session = undefined; // Simulation de l'absence totale de session

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    // Vérifie le message exact envoyé par le middleware
    expect(res.send).toHaveBeenCalledWith("Access denied. Not authenticated.");
    expect(next).not.toHaveBeenCalled();
  });

  // --- Cas 3: Échec - req.session.user est manquant ---
  it("devrait renvoyer 401 si req.session.user est manquant", async () => {
    req.session.user = null; // ou undefined

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Access denied. Not authenticated.");
    expect(next).not.toHaveBeenCalled();
  });

  // --- Cas 4: Échec - Utilisateur non trouvé en BDD ---
  it("devrait renvoyer 401 si l'utilisateur de la session n'est pas trouvé en BDD", async () => {
    User.findOne.mockResolvedValue(null); // La BDD ne retourne rien

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    // Ce cas renvoie aussi le message générique
    expect(res.send).toHaveBeenCalledWith("Access denied. Not authenticated.");
    expect(next).not.toHaveBeenCalled();
  });

  // --- Cas 5: Échec - Utilisateur archivé ---
  it("devrait renvoyer 401 si l'utilisateur est archivé", async () => {
    const archivedUser = {
      _id: "456",
      email: "test@example.com",
      archived: true,
    };
    User.findOne.mockResolvedValue(archivedUser);

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    // Ce cas a un message spécifique
    expect(res.send).toHaveBeenCalledWith("Account suspended.");
    expect(next).not.toHaveBeenCalled();
  });

  // --- Cas 6: Échec - Erreur de base de données ---
  it("devrait appeler next() avec une erreur si User.findOne échoue", async () => {
    const dbError = new Error("Erreur BDD simulée");
    User.findOne.mockRejectedValue(dbError); // Simuler un échec de la promesse

    await authMiddleware(req, res, next);

    // L'erreur doit être passée au gestionnaire d'erreurs d'Express
    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
