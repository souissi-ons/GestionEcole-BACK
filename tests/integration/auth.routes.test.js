// __tests__/integration/auth.routes.test.js

// Augmente le timeout pour le premier démarrage du serveur et la connexion BDD
jest.setTimeout(30000);

const request = require("supertest"); // Pour faire les requêtes HTTP
const { User, ROLES } = require("../../models/user"); // Pour créer/vérifier les utilisateurs en BDD
const bcrypt = require("bcrypt"); // Pour hasher le mot de passe avant de créer l'utilisateur
let server; // Variable pour tenir notre serveur Express
const mongoose = require("mongoose"); // Pour générer des ObjectId valides
const { RestrictedIP } = require("../../models/restrictedIp"); // Pour vérifier le blocage IP

// --- Groupe de tests pour les routes /api/auth ---
describe("/api/auth", () => {
  // --- Actions avant/après les tests ---
  beforeEach(async () => {
    // Démarrer le serveur avant chaque test
    server = require("../../index"); // !! Assurez-vous que index.js exporte le serveur !!

    // Nettoyer la base de données de test avant chaque test
    await User.deleteMany({});
    await RestrictedIP.deleteMany({});
  });

  afterEach(async () => {
    // Arrêter le serveur après chaque test
    await server.close();
    // Nettoyer à nouveau au cas où
    await User.deleteMany({});
    await RestrictedIP.deleteMany({});
  });

  // --- Tests pour POST /login ---
  describe("POST /login", () => {
    let loginData;
    let testUser;

    // Préparer un utilisateur valide en base avant chaque test de login
    beforeEach(async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Password123", salt);
      testUser = await new User({
        firstName: "Test",
        lastName: "Login",
        email: "login.test@app.com",
        password: hashedPassword,
        role: ROLES.TUTOR,
        identifier: "11112222",
        phoneNumber: "11223344",
        gender: "Male",
        birthDate: "1990-01-01",
        address: { street: "Rue", city: "Ville", postalCode: "1000" },
      }).save();

      loginData = {
        emailOrNumber: "login.test@app.com",
        password: "Password123",
      };
    });

    // Test TC-AUTH-001 (Connexion réussie)
    it("devrait retourner 200 et les infos utilisateur si les identifiants sont valides", async () => {
      const res = await request(server).post("/api/auth").send(loginData);

      // ASSERT : Vérifier la réponse HTTP et le corps
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("_id", testUser._id.toString());
      expect(res.body).toHaveProperty("email", "login.test@app.com");
      expect(res.body).not.toHaveProperty("password");

      // AJOUT : Vérifier que le cookie de session est bien envoyé
      expect(res.headers["set-cookie"]).toBeDefined();

      const userInDb = await User.findById(testUser._id);
      expect(userInDb.loginAttempts).toBe(0);
    });

    // Test TC-AUTH-002 (Échec MDP)
    it("devrait retourner 400 et incrémenter loginAttempts si le mot de passe est incorrect", async () => {
      loginData.password = "WrongPassword";
      const res = await request(server).post("/api/auth").send(loginData);

      expect(res.status).toBe(400);
      expect(res.text).toContain("Il vous reste 4 tentatives");
      const userInDb = await User.findById(testUser._id);
      expect(userInDb.loginAttempts).toBe(1);
    });

    // Test TC-AUTH-005 (Blocage Compte)
    it("devrait retourner 400 et bloquer le compte après 5 mots de passe incorrects", async () => {
      loginData.password = "WrongPassword";
      for (let i = 1; i <= 5; i++) {
        await request(server).post("/api/auth").send(loginData);
      }
      const res = await request(server).post("/api/auth").send(loginData);

      expect(res.status).toBe(400);
      expect(res.text).toContain("Votre compte est bloqué");
      const userInDb = await User.findById(testUser._id);
      expect(userInDb.locked).toBe(true);
    });

    // Test TC-AUTH-003 (Identifiant inexistant) + TC-AUTH-006 (Blocage IP)
    it("devrait retourner 400 et bloquer l'IP après 3 tentatives avec un identifiant inexistant", async () => {
      const wrongLoginData = {
        emailOrNumber: "unknown@app.com",
        password: "password",
      };

      for (let i = 1; i <= 3; i++) {
        const resAttempt = await request(server)
          .post("/api/auth")
          .send(wrongLoginData);
        expect(resAttempt.status).toBe(400);
        expect(resAttempt.text).toContain(`Tentatives restantes ${3 - i}`);
      }
      const resBlocked = await request(server)
        .post("/api/auth")
        .send(wrongLoginData);

      expect(resBlocked.status).toBe(400);
      expect(resBlocked.text).toBe("Vous êtes bloqué !");
    });

    // Test TC-AUTH-007 (Compte archivé)
    it("devrait retourner 401 si le compte est archivé", async () => {
      testUser.archived = true;
      await testUser.save();
      const res = await request(server).post("/api/auth").send(loginData);

      // Ce test ATTEND 401. Le bug est dans WrongLogin.js
      expect(res.status).toBe(401);
      expect(res.text).toContain("Account suspended");
    });

    // Test TC-AUTH-008 (Compte bloqué)
    it("devrait retourner 400 si le compte est déjà bloqué (locked: true)", async () => {
      testUser.locked = true;
      await testUser.save();
      const res = await request(server).post("/api/auth").send(loginData);

      expect(res.status).toBe(400);
      expect(res.text).toContain("Votre compte est bloqué");
    });
  });

  // --- Tests pour POST /login/google ---
  describe("POST /login/google", () => {
    const { OAuth2Client } = require("google-auth-library");
    jest.mock("google-auth-library");

    beforeEach(async () => {
      await new User({
        firstName: "Google",
        lastName: "User",
        email: "google.user@app.com",
        password: "hashedPassword",
        role: ROLES.TUTOR,
        identifier: "33334444",
        phoneNumber: "33445566",
        gender: "Female",
        birthDate: "1992-02-02",
        address: { street: "Rue G", city: "Ville G", postalCode: "3000" },
      }).save();
      OAuth2Client.prototype.verifyIdToken = jest.fn();
    });

    it("devrait connecter l'utilisateur si le token Google est valide et l'email existe", async () => {
      const mockPayload = { email: "google.user@app.com" };
      OAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const res = await request(server)
        .post("/api/auth/login/google")
        .send({ token: "validGoogleToken" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("email", "google.user@app.com");
    });

    it("devrait retourner 400 si le token Google est valide mais l'email n'existe pas en BDD", async () => {
      const mockPayload = { email: "unknown.google@app.com" };
      OAuth2Client.prototype.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const res = await request(server)
        .post("/api/auth/login/google")
        .send({ token: "validGoogleTokenUnknownEmail" });

      expect(res.status).toBe(400);
      expect(res.text).toContain("L'identifiant saisi est erroné");
    });

    it("devrait retourner 500 si le token Google est invalide", async () => {
      OAuth2Client.prototype.verifyIdToken.mockRejectedValue(
        new Error("Invalid token")
      );

      const res = await request(server)
        .post("/api/auth/login/google")
        .send({ token: "invalidGoogleToken" });

      expect(res.status).toBe(500);
      expect(res.text).toContain("Invalid token");
    });
  });
}); // Fin describe /api/auth
