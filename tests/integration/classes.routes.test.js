// Augmente le timeout pour les connexions BDD
jest.setTimeout(60000);

// Charger .env en premier
require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const { Classe } = require("../../models/classe");
const { Level } = require("../../models/level");
const { SchoolYear } = require("../../models/schoolYear");
const { Session } = require("../../models/session"); // Pour test de conflit
const { Course } = require("../../models/course"); // Pour test de conflit

let server;
let currentYear;
let level; // Variables pour stocker les prérequis

// Vérification de sécurité
if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must be run with NODE_ENV=test");
}

describe("/api/classes (Intégration)", () => {
  // Démarrer le serveur et la BDD une seule fois
  beforeAll(() => {
    server = require("../../index");
  });

  // Fermer le serveur et la BDD une seule fois
  afterAll(async () => {
    await server.close();
    await mongoose.disconnect();
  });

  // Vider les collections ET créer les prérequis avant chaque test
  beforeEach(async () => {
    // Vider dans l'ordre inverse des dépendances
    await Session.deleteMany({});
    await Course.deleteMany({});
    await Classe.deleteMany({});
    await Level.deleteMany({});
    await SchoolYear.deleteMany({});

    // --- ARRANGE ---
    // 1. Créer une SchoolYear "en cours"
    currentYear = await new SchoolYear({
      schoolYear: "2024-2025",
      current: true,
    }).save();

    // 2. Créer un Level lié à cette année
    level = await new Level({
      levelName: "6ème",
      schoolYear: currentYear._id,
    }).save();
  });

  // --- POST /api/classes ---
  describe("POST /", () => {
    it("devrait créer une nouvelle classe (200) si le body est valide", async () => {
      const body = {
        classeName: "6A",
        level: level._id, // Utilise l'ID du niveau créé
        capacity: 30,
      };

      const res = await request(server).post("/api/classes").send(body);

      expect(res.status).toBe(200);
      expect(res.body.classeName).toBe("6A");
      expect(res.body.level).toBe(level._id.toString());
      expect(res.body.schoolYear).toBe(currentYear._id.toString());
    });

    it("devrait renvoyer 400 si la classe existe déjà pour cette année", async () => {
      // 1. Arrange: Créer une classe "6A"
      await new Classe({
        classeName: "6A",
        level: level._id,
        schoolYear: currentYear._id,
        capacity: 25,
      }).save();

      // 2. Act: Tenter de la recréer
      const body = { classeName: "6A", level: level._id, capacity: 30 };
      const res = await request(server).post("/api/classes").send(body);

      // 3. Assert
      expect(res.status).toBe(400);
      expect(res.text).toBe("Class already exists");
    });
  });

  // --- DELETE /api/classes/:id ---
  describe("DELETE /:id", () => {
    it("devrait supprimer la classe (200) si elle n'est pas utilisée", async () => {
      // 1. Arrange
      const classe = await new Classe({
        classeName: "A Supprimer",
        level: level._id,
        schoolYear: currentYear._id,
        capacity: 30,
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/classes/${classe._id}`);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(classe._id.toString());
    });

    it("devrait renvoyer 409 si la classe est utilisée par un Course", async () => {
      // 1. Arrange
      const classe = await new Classe({
        classeName: "Utilisée",
        level: level._id,
        schoolYear: currentYear._id,
        capacity: 30,
      }).save();

      await new Course({
        classe: classe._id,
        teacher: new mongoose.Types.ObjectId(), // fictif
        levelSubject: new mongoose.Types.ObjectId(), // fictif
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/classes/${classe._id}`);

      // 3. Assert
      expect(res.status).toBe(409);
      expect(res.text).toContain("La classe est associée à un cours.");
    });
  });
});
