// Augmente le timeout pour les connexions BDD
jest.setTimeout(60000);

// Charger .env en premier
require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const { Room } = require("../../models/room");
const { Session } = require("../../models/session"); // Nécessaire pour le test de suppression

let server;

// Vérification de sécurité
if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must be run with NODE_ENV=test");
}

describe("/api/rooms (Intégration)", () => {
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
    await Room.deleteMany({});
    await Session.deleteMany({}); // Vider aussi les sessions
  });

  // --- POST /api/rooms ---
  describe("POST /", () => {
    it("devrait créer une nouvelle salle (200) si le body est valide", async () => {
      const body = { roomName: "Salle 101", capacity: 30 };

      const res = await request(server).post("/api/rooms").send(body);

      // Le statut de succès de votre route est 200, pas 201
      expect(res.status).toBe(200);

      // Vérifier l'état de la BDD
      const roomInDb = await Room.findOne({ roomName: "Salle 101" });
      expect(roomInDb).not.toBeNull();
      expect(roomInDb.capacity).toBe(30);
    });

    it("devrait renvoyer 400 si une salle avec le même nom existe déjà", async () => {
      // 1. Arrange: Créer une salle
      await new Room({ roomName: "Salle 101", capacity: 30 }).save();

      // 2. Act: Tenter de la recréer
      const body = { roomName: "Salle 101", capacity: 25 };
      const res = await request(server).post("/api/rooms").send(body);

      // 3. Assert
      expect(res.status).toBe(400);
      expect(res.text).toBe("Room already exists");
    });

    it("devrait renvoyer 400 si le 'roomName' est manquant", async () => {
      const body = { capacity: 30 }; // 'roomName' manquant
      const res = await request(server).post("/api/rooms").send(body);
      expect(res.status).toBe(400); // Erreur de validation Joi
    });
  });

  // --- GET /api/rooms ---
  describe("GET /", () => {
    it("devrait renvoyer toutes les salles (200)", async () => {
      // 1. Arrange: Insérer des données de test
      await Room.insertMany([
        { roomName: "Salle A", capacity: 10 },
        { roomName: "Salle B", capacity: 20 },
      ]);

      // 2. Act
      const res = await request(server).get("/api/rooms");

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.some((r) => r.roomName === "Salle A")).toBe(true);
      expect(res.body.some((r) => r.roomName === "Salle B")).toBe(true);
    });
  });

  // --- PUT /api/rooms/:id ---
  describe("PUT /:id", () => {
    it("devrait mettre à jour la salle (200) si l'ID est valide", async () => {
      // 1. Arrange
      const room = await new Room({
        roomName: "Ancien Nom",
        capacity: 10,
      }).save();
      const newBody = { roomName: "Nouveau Nom", capacity: 15 };

      // 2. Act
      const res = await request(server)
        .put(`/api/rooms/${room._id}`)
        .send(newBody);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body.roomName).toBe("Nouveau Nom");
      expect(res.body.capacity).toBe(15);
    });

    it("devrait renvoyer 400 si l'ID est invalide", async () => {
      const newBody = { roomName: "Nouveau Nom", capacity: 15 };
      const res = await request(server).put(`/api/rooms/123`).send(newBody);

      // Le test attend 400, mais la route renvoie 500.
      // Le test échouera jusqu'à ce que la route soit corrigée.
      expect(res.status).toBe(400);
    });
  });

  // --- DELETE /api/rooms/:id ---
  describe("DELETE /:id", () => {
    it("devrait supprimer la salle (200) si elle n'est pas utilisée", async () => {
      // 1. Arrange
      const room = await new Room({
        roomName: "A Supprimer",
        capacity: 10,
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/rooms/${room._id}`);

      // 3. Assert
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(room._id.toString());

      // Vérifier en BDD
      const roomInDb = await Room.findById(room._id);
      expect(roomInDb).toBeNull();
    });

    it("devrait renvoyer 409 si la salle est utilisée dans une session", async () => {
      // 1. Arrange
      const room = await new Room({
        roomName: "Utilisée",
        capacity: 10,
      }).save();

      // On crée une session (avec le champ 'group' manquant corrigé)
      await new Session({
        room: room._id,
        day: 1,
        startTime: 10,
        endTime: 12,
        week: "both",
        classe: new mongoose.Types.ObjectId(),
        levelSubject: new mongoose.Types.ObjectId(),
        teacher: new mongoose.Types.ObjectId(),
        schoolYear: new mongoose.Types.ObjectId(),
        group: "both", // <-- CORRECTION (Ajout du champ requis)
      }).save();

      // 2. Act
      const res = await request(server).delete(`/api/rooms/${room._id}`);

      // 3. Assert
      expect(res.status).toBe(409);
      expect(res.text).toBe(
        "La salle est associée à une séance. Impossible de la supprimer."
      );

      // Vérifier en BDD que la salle existe toujours
      const roomInDb = await Room.findById(room._id);
      expect(roomInDb).not.toBeNull();
    });
  });
});
