// __tests__/unit/checkPhoneNumberMiddleware.test.js

const checkPhoneNumberMiddleware = require("../../middlewares/checkPhoneNumber");
const { User, ROLES } = require("../../models/user");

// --- Mocking du modèle User ---
// On dit à Jest de remplacer l'import réel par cette simulation
jest.mock("../../models/user", () => ({
  User: {
    findOne: jest.fn(), // On simule la fonction findOne
  },
  ROLES: {
    // Il faut aussi exporter les constantes si on mock tout le module
    STUDENT: "Elève",
    TUTOR: "Tuteur",
    TEACHER: "Enseignant",
    ADMIN: "Admin",
  },
}));

// --- Groupe de Tests ---
describe("Tests Unitaires : checkPhoneNumberMiddleware", () => {
  // --- Mocks ---
  let req;
  let res;
  let next;

  // --- Préparation (avant chaque test) ---
  beforeEach(() => {
    jest.clearAllMocks(); // Réinitialise les mocks avant chaque test (TRÈS IMPORTANT!)
    req = { body: {} }; // Simuler le corps de la requête
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  // --- Test 1: Champ Requis (Tuteur) ---
  it("devrait renvoyer 400 si Tuteur et phoneNumber manquant", async () => {
    // ARRANGE
    req.body = { role: ROLES.TUTOR, email: "tuteur@app.com" }; // Pas de phoneNumber
    // ACT
    await checkPhoneNumberMiddleware(req, res, next);
    // ASSERT
    expect(next).not.toHaveBeenCalled(); // Bloqué
    expect(User.findOne).not.toHaveBeenCalled(); // Pas d'appel BDD
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Phone number is required");
  });

  // --- Test 2: Champ Non Requis (Élève) ---
  it("devrait appeler next() si Elève et phoneNumber manquant", async () => {
    // ARRANGE
    req.body = { role: ROLES.STUDENT, email: "eleve@app.com" }; // Pas de phoneNumber
    // ACT
    await checkPhoneNumberMiddleware(req, res, next);
    // ASSERT
    expect(next).toHaveBeenCalledTimes(1); // Doit passer
    expect(User.findOne).not.toHaveBeenCalled(); // Pas de vérif d'unicité
  });

  // --- Test 3: Unicité - Numéro déjà pris ---
  it("devrait renvoyer 400 si phoneNumber existe pour un autre email", async () => {
    // ARRANGE
    req.body = {
      role: ROLES.TUTOR,
      email: "nouveau@app.com",
      phoneNumber: "98 765 432",
    };
    // Simuler que findOne trouve un utilisateur existant
    User.findOne.mockResolvedValue({ email: "ancien@app.com" });
    // ACT
    await checkPhoneNumberMiddleware(req, res, next);
    // ASSERT
    // Vérifier que findOne a été appelé avec le numéro nettoyé et l'exclusion de l'email actuel
    expect(User.findOne).toHaveBeenCalledWith({
      phoneNumber: "98765432",
      email: { $ne: "nouveau@app.com" },
    });
    expect(next).not.toHaveBeenCalled(); // Bloqué
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Phone number is already used");
  });

  // --- Test 4: Unicité - Numéro existant mais pour le même utilisateur (OK) ---
  it("devrait appeler next() si phoneNumber existe pour le même email (cas modification)", async () => {
    // ARRANGE
    req.body = {
      role: ROLES.TUTOR,
      email: "existant@app.com",
      phoneNumber: "11 22 33 44",
    };
    // Simuler que findOne ne trouve AUCUN AUTRE utilisateur
    User.findOne.mockResolvedValue(null);
    // ACT
    await checkPhoneNumberMiddleware(req, res, next);
    // ASSERT
    expect(User.findOne).toHaveBeenCalledWith({
      phoneNumber: "11223344", // Nettoyé
      email: { $ne: "existant@app.com" }, // Excluant l'actuel
    });
    expect(next).toHaveBeenCalledTimes(1); // Doit passer
  });
});
