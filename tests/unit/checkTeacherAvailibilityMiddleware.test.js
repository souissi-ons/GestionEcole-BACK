const checkTeacherAvailability = require("../../middlewares/checkTeacherAvailability");
const { Session } = require("../../models/session");

// --- On simule le modèle Session ---
jest.mock("../../models/session");

describe("checkTeacherAvailability middleware (Unit Test)", () => {
  let req, res, next;

  // Avant chaque test, on prépare des mocks "frais"
  beforeEach(() => {
    // Réinitialise l'historique des appels
    jest.clearAllMocks();

    // Crée des simulations pour req, res, et next
    req = {
      body: {},
      method: "POST",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  // Pas besoin de afterEach pour fermer le serveur

  it("should allow the reservation if there are no conflicts", async () => {
    req.body = {
      week: "both",
      day: 5,
      teacher: "6428376a11eef8aaff8c780b", // Prof non conflictuel (ou autre ID)
      startTime: 8,
      endTime: 9,
    };

    // --- SIMULATION ---
    // On simule la chaîne ".findOne(...).populate(...)"
    const mockQuery = { populate: jest.fn() };
    Session.findOne.mockReturnValue(mockQuery);

    // On dit à la BDD de ne RIEN trouver (pas de conflit)
    mockQuery.populate.mockResolvedValue(null);

    // On exécute le middleware
    await checkTeacherAvailability(req, res, next);

    // VÉRIFICATIONS :
    expect(Session.findOne).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return a 409 error if the teacher is already reserved", async () => {
    req.body = {
      week: "both",
      day: 0,
      teacher: "6428376a11eef8aaff8c780b", // Prof conflictuel
      startTime: 10,
      endTime: 12,
    };

    // --- SIMULATION ---
    // On crée la "fausse" réservation que la BDD va retourner.
    const fakeExistingSession = {
      startTime: 10,
      endTime: 12,
      week: "both",
      classe: { classeName: "8B1" }, // L'objet "populé"
    };

    // On simule la chaîne ".findOne(...).populate(...)"
    const mockQuery = { populate: jest.fn() };
    Session.findOne.mockReturnValue(mockQuery);

    // On dit à la BDD de TROUVER la fausse réservation
    mockQuery.populate.mockResolvedValue(fakeExistingSession);

    // On exécute le middleware
    await checkTeacherAvailability(req, res, next);

    // VÉRIFICATIONS :
    expect(Session.findOne).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    // Ce message est basé sur votre fichier checkTeacherAvailability.js
    expect(res.send).toHaveBeenCalledWith(
      "L'enseignant a déjà une séance pendant cet intervalle de temps.Enseigne la classe 8B1·\n  de 10h à 12h."
    );
  });
});
