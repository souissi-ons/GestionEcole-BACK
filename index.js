const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { User } = require("./models/user");
const {
  setupSendMessageEvent,
  setupUploadFileEvent,
  joinChatGroups,
} = require("./utils/sendMessage");

const app = express();

require("dotenv").config();
const port = process.env.PORT;
const hour = 60 * 60 * 10000;

const sessionMiddleware = session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3 * hour, secure: false },
});

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

require("./startup/db")();
require("./startup/routes")(app);

const server = app.listen(port, () => console.log(`listening on port ${port}`));
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
    credentials: true,
  },
});
io.use(wrap(sessionMiddleware));
const userSockets = new Map();

io.on("connection", handleSocketConnection);

function handleSocketConnection(socket) {
  console.log("user connected");
  if (!socket.request.session.user) {
    socket.emit("notConnected");
    return;
  }

  const user = socket.request.session.user;

  userSockets.set(user._id, socket.id);
  joinChatGroups(socket, user, io);
  setupSendMessageEvent(socket, user, io, userSockets); // on newMessage
  setupUploadFileEvent(socket, user, io, userSockets); // on uploadFile

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
}

module.exports = server;
module.exports.app = app;
