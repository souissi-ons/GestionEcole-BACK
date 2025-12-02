// Augmente le timeout pour les connexions BDD
jest.setTimeout(30000);

// Charger .env en premier
require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const { Level } = require("../../models/level");
const { SchoolYear } = require("../../models/schoolYear");
const { Classe } = require("../../models/classe"); // Pour le test de suppression (conflit)
const { LevelSubject } = require("../../models/levelSubject"); // Pour le test de suppression (conflit)

let server;
let currentYear; // Variable pour stocker l'année en cours

// Vérification de sécurité
if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must be run with NODE_ENV=test");
}

describe("/api/levels (Intégration)", () => {
  // Démarrer le serveur et la BDD une seule fois
  beforeAll(() => {
    server = require("../../index"); // Lance le serveur (et la connexion BDD)
  });

  // Fermer le serveur et la BDD une seule fois
  afterAll(async () => {
    await server.close();
    await mongoose.disconnect();
  });

  // Vider les collections ET créer une SchoolYear avant chaque test
  beforeEach(async () => {
    await SchoolYear.deleteMany({});
    await Level.deleteMany({});
    await Classe.deleteMany({});
    await LevelSubject.deleteMany({});

    // --- IMPORTANT ---
    // On crée une SchoolYear "en cours" pour que les routes /api/levels fonctionnent
    currentYear = await new SchoolYear({
      schoolYear: "2024-2025",
      current: true,
    }).save();
  });

  // --- POST /api/levels ---
  describe("POST /", () => {
    it("devrait créer un nouveau niveau (200) s'il n'existe pas", async () => {
      const body = { levelName: "6ème" };

      const res = await request(server).post("/api/levels").send(body);

      expect(res.status).toBe(200);
      expect(res.body.levelName).toBe("6ème");
      // Vérifier qu'il est bien lié à l'année en cours
      expect(res.body.schoolYear).toBe(currentYear._id.toString());

      // Vérifier en BDD
      const levelInDb = await Level.findOne({ levelName: "6ème" });
      expect(levelInDb).not.toBeNull();
    });

    it("devrait renvoyer 400 si le niveau existe déjà pour l'année en cours", async () => {
      // 1. Arrange: Créer un niveau "6ème"
      await new Level({
        levelName: "6ème",
        schoolYear: currentYear._id,
      }).save();

      // 2. Act: Tenter de le recréer
      const body = { levelName: "6ème" };
      const res = await request(server).post("/api/levels").send(body);

      // 3. Assert
      expect(res.status).toBe(400);
      expect(res.text).toBe("Level already exists");
    });
  });

  // --- GET /api/levels ---
  describe("GET /", () => {
    it("devrait renvoyer tous les niveaux (200)", async () => {
      // 1. Arrange
      await Level.insertMany([
        { levelName: "6ème", schoolYear: currentYear._id },
        { levelName: "5ème", schoolYear: currentYear._id },
      ]);

      // 2. Act
      const res = await request(server).get("/api/levels");

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((l) => l.levelName === "6ème")).toBe(true);
    });
  });

  // --- PUT /api/levels/:id ---
  describe("PUT /:id", () => {
    it("devrait mettre à jour le niveau (200) si l'ID est valide", async () => {
      // 1. Arrange
      const level = await new Level({
        levelName: "Ancien Nom",
        schoolYear: currentYear._id,
      }).save();
      const newBody = { levelName: "Nouveau Nom" };

      // 2. Act
      const res = await request(server)
        .put(`/api/levels/${level._id}`)
        .send(newBody);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.levelName).toBe("Nouveau Nom");
    });

    it("devrait renvoyer 400 si l'ID est invalide", async () => {
      const newBody = { levelName: "Nouveau Nom" };
      const res = await request(server).put(`/api/levels/123`).send(newBody);

      // Ce test échouera (500) si la validation d'ID n'est pas faite
      expect(res.status).toBe(400);
    });
  });
});
