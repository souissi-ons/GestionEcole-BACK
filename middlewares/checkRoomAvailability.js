const { Session } = require("../models/session");
const checkRoomAvailability = async (req, res, next) => {
  let existingReservation;
  if (req.body.week !== "both") {
    // Check if the session for the specific week is already reserved
    existingReservation = await Session.findOne({
      week: { $in: [req.body.week, "both"] },
      day: req.body.day,
      room: req.body.room,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
      _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
    }).populate("classe", "classeName");
  } else {
    // Check if the session for week a or b is already reserved
    existingReservation = await Session.findOne({
      day: req.body.day,
      room: req.body.room,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
      _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
    }).populate("classe", "classeName");
  }
  if (existingReservation)
    return res.status(409).send(reservedMessage(existingReservation));
  return next();
};

function reservedMessage(session) {
  const { startTime, endTime, week, classe } = session;
  if (week === "both")
    return `La salle est déjà occupée pendant cet intervalle de temps.Par la classe ${classe.classeName}.
  du ${startTime}h aux ${endTime}h.`;
  return `La salle est déjà occupée pendant cet intervalle de temps en semaine ${week}.Par la classe ${classe.classeName} 
  du ${startTime}h aux ${endTime}h.`;
}
module.exports = checkRoomAvailability;
