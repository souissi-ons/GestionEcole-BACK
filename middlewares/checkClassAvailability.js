const { Session } = require("../models/session");
const checkClassAvailability = async (req, res, next) => {
  let existingReservation;
  if (req.body.week !== "both") {
    if (req.body.group !== "both")
      return res
        .status(409)
        .send("La séance par semaine doit être pour toute la classe");
    // Check if the session for the specific week is already reserved
    existingReservation = await Session.findOne({
      week: { $in: [req.body.week, "both"] },
      day: req.body.day,
      classe: req.body.classe,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
      _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
    }).populate("classe subject");
  } else {
    if (req.body.group !== "both") {
      // Check if the session for week a or b is already reserved
      existingReservation = await Session.findOne({
        day: req.body.day,
        group: { $in: [req.body.group, "both"] },
        classe: req.body.classe,
        startTime: { $lt: req.body.endTime },
        endTime: { $gt: req.body.startTime },
        _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
      }).populate("classe subject");
    } else {
      existingReservation = await Session.findOne({
        day: req.body.day,
        classe: req.body.classe,
        startTime: { $lt: req.body.endTime },
        endTime: { $gt: req.body.startTime },
        _id: req.method === "PUT" ? { $ne: req.params.id } : { $exists: true },
      }).populate("classe subject");
    }
  }
  if (existingReservation)
    return res.status(409).send(reservedMessage(existingReservation));
  return next();
};

function reservedMessage(session) {
  const { startTime, endTime, week, classe, subject, group } = session;
  if (week === "both") {
    if (group === "both")
      return `La classe ${classe.classeName} a déja un cours de ${subject.subject} pendant cet intervalle de temps.
  de ${startTime}h à ${endTime}h.`;
    else
      return `La groupe ${group} de la ${classe.classeName} a déja un cours de ${subject.subject} pendant cet intervalle de temps.
  de ${startTime}h à ${endTime}h.`;
  }
  return `La classe ${classe.classeName} a déja un cours de ${subject.subject} pendant cet intervalle de temps en semaine ${week}.
  de ${startTime}h à ${endTime}h.`;
}

module.exports = checkClassAvailability;
