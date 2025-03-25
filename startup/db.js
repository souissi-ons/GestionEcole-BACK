const mongoose = require("mongoose");
require("dotenv").config();
const db =
  process.env.NODE_ENV === "test" ? process.env.TEST_DB : process.env.DB;

module.exports = function () {
  console.log(process.env.NODE_ENV);
  console.log(db);
  process.env.NODE_ENV === "test";
  mongoose
    .connect(db, {
      family: 4,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected successfully to " + db);
    })
    .catch((err) => console.log(err));
};
