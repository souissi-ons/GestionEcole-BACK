const checkRoomAvailability = require("../../middlewares/checkRoomAvailability");
const { Session } = require("../../models/session");

// --- LA PARTIE MAGIQUE ---
// On dit à Jest de simuler le modèle "Session".
// Le vrai fichier ne sera jamais appelé.
jest.mock("../../models/session");

describe("checkRoomAvailability middleware (Unit Test)", () => {
  let req, res, next;

  // Avant chaque test, on prépare des mocks "frais"
  beforeEach(() => {
    // Réinitialise l'historique des appels
    jest.clearAllMocks();

    // Crée des simulations pour req, res, et next
    req = {
      body: {},
      method: "POST", // La plupart des logiques de middleware dépendent de la méthode
    };
    res = {
      status: jest.fn().mockReturnThis(), // Permet de chainer .status().send()
      send: jest.fn(),
    };
    next = jest.fn();
  });

  // Pas besoin de afterEach pour fermer le serveur

  it("should allow the reservation if there are no conflicts", async () => {
    req.body = {
      week: "both",
      day: 5,
      // ... autres champs
      room: "643f6bdf404c3073af27cee1", // Salle non conflictuelle
      startTime: 8,
      endTime: 9,
    };

    // --- SIMULATION ---
    // On simule la chaîne ".findOne(...).populate(...)"
    const mockQuery = { populate: jest.fn() };
    Session.findOne.mockReturnValue(mockQuery);

    // On dit à la BDD de ne RIEN trouver (pas de conflit)
    // .populate() résoudra avec "null"
    mockQuery.populate.mockResolvedValue(null);

    // On exécute le middleware
    await checkRoomAvailability(req, res, next);

    // VÉRIFICATIONS :
    // 1. A-t-on bien cherché dans la BDD ?
    expect(Session.findOne).toHaveBeenCalled();
    // 2. A-t-on bien laissé passer la requête ?
    expect(next).toHaveBeenCalled();
    // 3. A-t-on évité d'envoyer une erreur ?
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return a 409 error if the room is already reserved", async () => {
    req.body = {
      week: "both",
      day: 0,
      // ... autres champs
      room: "643f6bdf404c3073af27cee0", // Salle conflictuelle
      startTime: 10,
      endTime: 12,
    };

    // --- SIMULATION ---
    // On crée la "fausse" réservation que la BDD va retourner.
    // Elle doit contenir les champs utilisés par reservedMessage()
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
    await checkRoomAvailability(req, res, next);

    // VÉRIFICATIONS :
    // 1. A-t-on bien cherché dans la BDD ?
    expect(Session.findOne).toHaveBeenCalled();
    // 2. A-t-on bien bloqué la requête ?
    expect(next).not.toHaveBeenCalled();
    // 3. A-t-on envoyé le bon statut d'erreur et le bon message ?
    expect(res.status).toHaveBeenCalledWith(409);
    // Le message vient de votre fichier checkRoomAvailability.js
    expect(res.send).toHaveBeenCalledWith(
      "La salle est déjà occupée pendant cet intervalle de temps.Par la classe 8B1.\n  du 10h aux 12h."
    );
  });

  // On pourrait aussi ajouter un test pour la logique "week !== 'both'",
  // mais les deux tests ci-dessus couvrent les cas principaux.
});
