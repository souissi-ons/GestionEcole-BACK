const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images/");
  },
  filename: function (req, file, cb) {
    console.log(file)
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "files/");
  },
  filename: function (req, file, cb) {
    const uniqueFileName = `${uuidv4()}.${file.mimetype.split("/")[1]}`;
    cb(null, uniqueFileName);
  },
});

const uploadFile = multer({
  storage: fileStorage,
});

exports.upload = upload;
exports.uploadFile = uploadFile;
