const { Room } = require("../models/room");
const { Session } = require("../models/session");
const router = require("express").Router();
const Joi = require("joi");

// Add a room
router.post("/", async (req, res) => {
  try {
    const schema = Joi.object({
      roomName: Joi.string().required(),
      capacity: Joi.number().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let room = await Room.findOne({
      roomName: { $regex: new RegExp(`^${req.body.roomName}$`, "i") }, // case insensitive when comparing
    });
    if (room) return res.status(400).send("Room already exists");
    const newRoom = new Room({
      roomName: req.body.roomName,
      capacity: req.body.capacity,
    });
    await newRoom.save();
    res.status(200).send(room);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Get all rooms
router.get("/", async (req, res) => {
  try {
    let rooms = await Room.find().select("-__v");
    res.send(rooms);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Update a particular room
router.put("/:id", async (req, res) => {
  try {
    const schema = Joi.object({
      roomName: Joi.string().required(),
      capacity: Joi.number().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(400).send("Room with given id not found");

    const existingRoom = await Room.findOne({
      roomName: { $regex: new RegExp(`^${req.body.roomName}$`, "i") }, // case insensitive when comparing
      _id: { $ne: req.params.id }, // ignore the current document being updated
    });
    if (existingRoom) return res.status(400).send("Room already exists");

    room.roomName = req.body.roomName;
    await room.save();

    res.status(200).send(room);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Delete a particular romm
router.delete("/:id", async (req, res) => {
  try {
    const room = await Room.findById({ _id: req.params.id });
    if (!room) return res.status(400).send("Room with given id not found");

    const session = await Session.findOne({ room: req.params.id });
    if (session)
      return res
        .status(409)
        .send("La salle est associée à une séance. Impossible de la supprimer.");
    await room.deleteOne();
    res.send(room);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});
module.exports = router;
