// __tests__/integration/users.routes.test.js

const request = require("supertest");
const { User, ROLES } = require("../../models/user");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
let server;

// --- DÉCLARER LES AGENTS ICI ---
let adminAgent, tutorAgent;

// CORRECTION: Importer RestrictedIP pour le nettoyage
const { RestrictedIP } = require("../../models/restrictedIp");

// Mocker le middleware d'upload d'avatar pour simplifier
jest.mock("../../middlewares/upload", () => ({
  upload: {
    single: (fieldName) => (req, res, next) => {
      req.file = { filename: "avatar_simule.jpg", path: "chemin/simule" };
      next();
    },
  },
}));
// Mocker le middleware de contenu adulte
jest.mock(
  "../../middlewares/checkAdultContent",
  () => (req, res, next) => next()
);
// Mocker l'envoi d'email
jest.mock("../../utils/sendEmail", () => ({
  sendNewPasswordEmail: jest.fn(),
}));

describe("/api/users (Intégration)", () => {
  let adminUser, tutorUser, studentUser;

  // Démarrer le serveur et créer les agents UNE SEULE FOIS
  beforeAll(async () => {
    server = require("../../index");
    adminAgent = request.agent(server);
    tutorAgent = request.agent(server);
  });

  // Fermer le serveur UNE SEULE FOIS
  afterAll(async () => {
    await server.close();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Nettoyer les collections avant chaque test
    await User.deleteMany({});
    await RestrictedIP.deleteMany({}); // <-- TRÈS IMPORTANT

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Password123", salt);

    // --- Création des utilisateurs de test ---
    adminUser = await new User({
      firstName: "Admin",
      lastName: "Test",
      email: "admin@app.com",
      password: hashedPassword,
      role: ROLES.ADMIN,
      identifier: "11111111",
      gender: "Male",
      birthDate: "1990-01-01",
      address: { street: "Rue", city: "Ville", postalCode: "1000" },
      phoneNumber: "11111111",
    }).save();

    tutorUser = await new User({
      firstName: "Tuteur",
      lastName: "Test",
      email: "tutor@app.com",
      password: hashedPassword,
      role: ROLES.TUTOR,
      identifier: "22222222",
      gender: "Female",
      birthDate: "1990-01-01",
      address: { street: "Rue", city: "Ville", postalCode: "1000" },
      phoneNumber: "22222222",
    }).save();

    // --- RE-CONNECTER les agents ---
    // (Car les utilisateurs ont été recréés)
    await adminAgent.post("/api/auth").send({
      emailOrNumber: "admin@app.com",
      password: "Password123",
    });

    await tutorAgent.post("/api/auth").send({
      emailOrNumber: "tutor@app.com",
      password: "Password123",
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await RestrictedIP.deleteMany({});
    jest.clearAllMocks();
  });

  jest.setTimeout(30000); // 30 seconds

  // --- Tests pour POST /check-email ---
  describe("POST /check-email", () => {
    it("devrait renvoyer 409 si l'email existe déjà", async () => {
      // Le 'adminUser' existe grâce au beforeEach
      const res = await request(server)
        .post("/api/users/check-email")
        .send({ email: "admin@app.com" });
      expect(res.status).toBe(409);
      expect(res.text).toBe("email already exists.");
    });

    it("devrait renvoyer 200 si l'email est disponible", async () => {
      const res = await request(server)
        .post("/api/users/check-email")
        .send({ email: "nouveau@app.com" });
      expect(res.status).toBe(200);
    });
  });

  // --- Tests pour POST / (Créer Utilisateur) ---
  describe("POST /", () => {
    let newUserData;
    beforeEach(() => {
      newUserData = {
        firstName: "Nouveau",
        lastName: "Prof",
        email: "prof.new@app.com",
        role: ROLES.TEACHER,
        identifier: "33333333",
        gender: "Male",
        birthDate: "1985-01-01",
        address: { street: "Rue Neuve", city: "Ville", postalCode: "1000" },
        phoneNumber: "33333333",
        speciality: "Maths",
        workload: 20,
      };
    });

    it("devrait créer un utilisateur (200) si l'utilisateur est Admin", async () => {
      const res = await adminAgent.post("/api/users").send(newUserData);
      expect(res.status).toBe(200);
      const userInDb = await User.findOne({ email: "prof.new@app.com" });
      expect(userInDb).toBeDefined();
    });

    it("devrait renvoyer 403 si l'utilisateur n'est pas Admin", async () => {
      // L'agent 'tutorAgent' est authentifié (donc pas 401)
      const res = await tutorAgent.post("/api/users").send(newUserData);
      // Mais il n'est pas admin (donc 403)
      expect(res.status).toBe(403);
    });

    it("devrait renvoyer 400 si l'email est déjà utilisé", async () => {
      newUserData.email = "admin@app.com"; // Email de l'admin
      // L'agent 'adminAgent' est authentifié (pas 401) et admin (pas 403)
      const res = await adminAgent.post("/api/users").send(newUserData);
      // La route est atteinte, la logique métier renvoie 400
      expect(res.status).toBe(400);
      expect(res.text).toBe("Email is already used");
    });

    it("devrait renvoyer 400 si les données de validation Joi sont invalides", async () => {
      newUserData.firstName = "A"; // Trop court
      const res = await adminAgent.post("/api/users").send(newUserData);
      expect(res.status).toBe(400);
      expect(res.text).toContain("firstName");
    });
  });

  // --- Tests pour GET / (Tous les utilisateurs) ---
  describe("GET /", () => {
    it("devrait renvoyer 200 et la liste si Admin", async () => {
      const res = await adminAgent.get("/api/users");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // admin + tutor
    });

    it("devrait renvoyer 403 si non-Admin", async () => {
      const res = await tutorAgent.get("/api/users");
      expect(res.status).toBe(403);
    });
  });

  // --- Tests pour PUT /:id/change-status (Archiver) ---
  describe("PUT /:id/change-status", () => {
    it("devrait archiver un utilisateur (200) si Admin", async () => {
      const res = await adminAgent
        .put(`/api/users/${tutorUser._id}/change-status`)
        .send({ archived: true });

      expect(res.status).toBe(200);
      const updatedUser = await User.findById(tutorUser._id);
      expect(updatedUser.archived).toBe(true);
    });

    it("devrait renvoyer 403 si non-Admin", async () => {
      const res = await tutorAgent
        .put(`/api/users/${adminUser._id}/change-status`)
        .send({ archived: true });
      expect(res.status).toBe(403);
    });
  });

  // --- Tests pour PUT /change-password ---
  describe("PUT /change-password", () => {
    it("devrait changer le mot de passe (200) si authentifié et mdp actuel correct", async () => {
      const body = {
        currentPassword: "Password123",
        password: "NouveauPassword456",
        confirmPassword: "NouveauPassword456",
      };

      // L'agent "Tuteur" change son propre mot de passe
      const res = await tutorAgent.put("/api/users/change-password").send(body);
      expect(res.status).toBe(200);

      // Vérifier que le nouveau mot de passe fonctionne
      const userInDb = await User.findById(tutorUser._id);
      const valid = await bcrypt.compare(
        "NouveauPassword456",
        userInDb.password
      );
      expect(valid).toBe(true);
    });

    it("devrait renvoyer 400 si le mot de passe actuel est incorrect", async () => {
      const body = {
        currentPassword: "MAUVAIS_MOT_DE_PASSE",
        password: "NouveauPassword456",
        confirmPassword: "NouveauPassword456",
      };
      const res = await tutorAgent.put("/api/users/change-password").send(body);
      expect(res.status).toBe(400);
      expect(res.text).toBe("Current password is invalid");
    });

    it("devrait renvoyer 401 si non authentifié", async () => {
      const body = {
        currentPassword: "a",
        password: "b",
        confirmPassword: "b",
      };
      // On utilise 'request(server)' (non authentifié) au lieu de 'tutorAgent'
      const res = await request(server)
        .put("/api/users/change-password")
        .send(body);
      expect(res.status).toBe(401); // Bloqué par authMiddleware
    });
  });

  // --- Tests pour PUT /change-avatar ---
  describe("PUT /change-avatar", () => {
    it("devrait mettre à jour l'avatar (200) si authentifié", async () => {
      // On utilise l'agent Tuteur. Le middleware d'upload est mocké (voir en haut)
      // pour retourner "avatar_simule.jpg"
      const res = await tutorAgent.put("/api/users/change-avatar").send(); // Pas besoin de .attach() car l'upload est mocké

      expect(res.status).toBe(200);
      expect(res.body.avatar).toBe("avatar_simule.jpg");

      const userInDb = await User.findById(tutorUser._id);
      expect(userInDb.avatar).toBe("avatar_simule.jpg");
    });
  });
});
