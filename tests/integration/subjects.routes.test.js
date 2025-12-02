// Augmente le timeout pour les connexions BDD
jest.setTimeout(60000);

// Charger .env en premier
require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const { Subject, validateSubject } = require("../../models/subject");
const { LevelSubject } = require("../../models/levelSubject"); // Pour le test de suppression

let server;

// Vérification de sécurité
if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must be run with NODE_ENV=test");
}

describe("/api/subjects (Intégration)", () => {
  // Démarrer le serveur et la BDD une seule fois
  beforeAll(() => {
    server = require("../../index"); // Lance le serveur (et la connexion BDD)
  });

  // Fermer le serveur et la BDD une seule fois
  afterAll(async () => {
    await server.close();
    await mongoose.disconnect();
  });

  // Vider les collections avant chaque test
  beforeEach(async () => {
    await Subject.deleteMany({});
    await LevelSubject.deleteMany({}); // Vider aussi les dépendances
  });

  // --- POST /api/subjects ---
  describe("POST /", () => {
    it("devrait créer une nouvelle matière (200) si le body est valide", async () => {
      const body = { subjectName: "Mathématiques", color: "#FF0000" };

      const res = await request(server).post("/api/subjects").send(body);

      // Votre route 'subjects' renvoie 200 OK (pas 201)
      expect(res.status).toBe(200);

      // La route renvoie 'send()' (vide), donc on vérifie la BDD
      const subjectInDb = await Subject.findOne({
        subjectName: "Mathématiques",
      });
      expect(subjectInDb).not.toBeNull();
      expect(subjectInDb.color).toBe("#FF0000");
    });

    it("devrait renvoyer 400 si une matière avec le même nom existe déjà", async () => {
      // 1. Arrange: Créer une matière
      await new Subject({ subjectName: "Français", color: "#00FF00" }).save();

      // 2. Act: Tenter de la recréer
      const body = { subjectName: "Français", color: "#0000FF" };
      const res = await request(server).post("/api/subjects").send(body);

      // 3. Assert
      expect(res.status).toBe(400);
      expect(res.text).toBe("Subject already exists");
    });

    it("devrait renvoyer 400 si 'subjectName' est manquant (validation Joi)", async () => {
      const body = { color: "#FF0000" }; // 'subjectName' manquant
      const res = await request(server).post("/api/subjects").send(body);
      expect(res.status).toBe(400);
      expect(res.text).toContain('"subjectName" is required');
    });
  });

  // --- GET /api/subjects ---
  describe("GET /", () => {
    it("devrait renvoyer toutes les matières (200)", async () => {
      // 1. Arrange: Insérer des données de test
      await Subject.insertMany([
        { subjectName: "Histoire", color: "#AAA" },
        { subjectName: "Géographie", color: "#BBB" },
      ]);

      // 2. Act
      const res = await request(server).get("/api/subjects");

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((s) => s.subjectName === "Histoire")).toBe(true);
      expect(res.body.some((s) => s.subjectName === "Géographie")).toBe(true);
    });
  });

  // --- PUT /api/subjects/:id ---
  describe("PUT /:id", () => {
    it("devrait mettre à jour la matière (200) si l'ID est valide", async () => {
      // 1. Arrange
      const subject = await new Subject({
        subjectName: "Ancien Nom",
        color: "#000",
      }).save();
      const newBody = { subjectName: "Nouveau Nom", color: "#111" };

      // 2. Act
      const res = await request(server)
        .put(`/api/subjects/${subject._id}`)
        .send(newBody);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.subjectName).toBe("Nouveau Nom");
      expect(res.body.color).toBe("#111");
    });

    it("devrait renvoyer 400 si l'ID est invalide", async () => {
      const newBody = { subjectName: "Nouveau Nom", color: "#111" };
      const res = await request(server).put(`/api/subjects/123`).send(newBody);

      // Ce test échouera si la validation d'ID n'est pas faite
      expect(res.status).toBe(400);
      // Le message peut varier : "Invalid ID format" (si vous l'ajoutez)
      // ou "Subject with the given id not found" (si l'ID est un ObjectId valide mais inexistant)
    });
  });

  // --- DELETE /api/subjects/:id ---
  describe("DELETE /:id", () => {
    it("devrait supprimer la matière (200) si elle n'est pas utilisée", async () => {
      // 1. Arrange
      const subject = await new Subject({
        subjectName: "A Supprimer",
        color: "#222",
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/subjects/${subject._id}`);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(subject._id.toString());

      // Vérifier en BDD
      const subjectInDb = await Subject.findById(subject._id);
      expect(subjectInDb).toBeNull();
    });

    it("devrait renvoyer 409 si la matière est utilisée dans un LevelSubject", async () => {
      // 1. Arrange
      const subject = await new Subject({
        subjectName: "Utilisée",
        color: "#333",
      }).save();

      // On crée un LevelSubject qui utilise cette matière
      await new LevelSubject({
        subject: subject._id,
        level: new mongoose.Types.ObjectId(), // ID fictif
        hoursNumber: 4,
        coefficient: 2,
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/subjects/${subject._id}`);

      // 3. Assert
      expect(res.status).toBe(409);
      expect(res.text).toBe(
        "La matière est associée à un cours. Impossible de supprimer."
      );

      // Vérifier en BDD que la matière existe toujours
      const subjectInDb = await Subject.findById(subject._id);
      expect(subjectInDb).not.toBeNull();
    });
  });
});
