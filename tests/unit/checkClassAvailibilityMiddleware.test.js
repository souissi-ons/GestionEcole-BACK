const checkClassAvailability = require("../../middlewares/checkClassAvailability");
const { Session } = require("../../models/session");

// --- LA LIGNE LA PLUS IMPORTANTE ---
// Dites à Jest de simuler ce fichier.
// SANS CELA, le test essaiera de se connecter à la BDD et plantera.
//
jest.mock("../../models/session");
//
// --- FIN DE LA PARTIE IMPORTANTE ---

describe("checkClassAvailability middleware (Unit Test)", () => {
  let req, res, next;

  // Avant chaque test, on réinitialise nos objets
  beforeEach(() => {
    // Réinitialise l'historique des mocks (combien de fois ils ont été appelés)
    jest.clearAllMocks();

    // Crée des mocks pour req, res, et next
    req = {
      body: {},
      method: "POST",
    };
    res = {
      status: jest.fn().mockReturnThis(), // Permet de chainer .status().send()
      send: jest.fn(),
    };
    next = jest.fn();
  });

  // PAS BESOIN de "afterEach" ou "afterAll" dans un test pur.

  it("should allow the reservation if there are no conflicts", async () => {
    req.body = {
      week: "both",
      day: 5,
      classe: "644e9f79e691173004c81a9e",
      group: "1",
      startTime: 8,
      endTime: 9,
    };

    // --- SIMULATION ---
    const mockQuery = { populate: jest.fn() };
    Session.findOne.mockReturnValue(mockQuery);

    // On dit à la simulation de retourner "null" (pas de conflit trouvé)
    mockQuery.populate.mockResolvedValue(null);

    // On exécute le middleware
    await checkClassAvailability(req, res, next);

    // VÉRIFICATIONS :
    expect(Session.findOne).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return a 409 error if the session is already reserved", async () => {
    req.body = {
      week: "both",
      day: 0,
      classe: "644e9f79e691173004c81a9e",
      group: "1",
      startTime: 10,
      endTime: 12,
    };

    // --- SIMULATION ---
    const fakeExistingSession = {
      week: "both",
      day: 0,
      group: "1",
      startTime: 10,
      endTime: 12,
      classe: { classeName: "8B1" },
      subject: { subjectName: "Francais" }, // Assurez-vous que c'est "subjectName"
    };

    const mockQuery = { populate: jest.fn() };
    Session.findOne.mockReturnValue(mockQuery);

    // On dit à la simulation de retourner notre fausse session
    mockQuery.populate.mockResolvedValue(fakeExistingSession);

    // On exécute le middleware
    await checkClassAvailability(req, res, next);

    // VÉRIFICATIONS :
    expect(Session.findOne).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith(
      "La groupe 1 de la 8B1 a déja un cours de Francais pendant cet intervalle de temps.\n  de 10h à 12h."
    );
  });

  it("should return a 409 error if the session is per week and per group", async () => {
    req.body = {
      week: "A", // Séance par semaine
      day: 5,
      group: "1", // Mais pour un seul groupe
    };

    // On exécute le middleware
    await checkClassAvailability(req, res, next);

    // VÉRIFICATIONS :
    expect(Session.findOne).not.toHaveBeenCalled(); // La BDD ne doit pas être appelée
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith(
      "La séance par semaine doit être pour toute la classe"
    );
  });
});
