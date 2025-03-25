const { Session } = require("../models/session");
const checkTeacherAvailability = async (req, res, next) => {
  let existingReservation;
  if (req.body.week !== "both") {
    // Check if the session for the specific week is already reserved
    existingReservation = await Session.findOne({
      week: { $in: [req.body.week, "both"] },
      day: req.body.day,
      teacher: req.body.teacher,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
      _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
    }).populate("classe", "classeName");
  } else {
    // Check if the session for week a or b is already reserved
    existingReservation = await Session.findOne({
      day: req.body.day,
      teacher: req.body.teacher,
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
    return `L'enseignant a déjà une séance pendant cet intervalle de temps.Enseigne la classe ${classe.classeName}·
  de ${startTime}h à ${endTime}h.`;
  return `L'enseignant a déjà une séance pendant cet intervalle de temps en semaine ${week}.Enseigne la classe ${classe.classeName} 
  de ${startTime}h à ${endTime}h.`;
}
module.exports = checkTeacherAvailability;
