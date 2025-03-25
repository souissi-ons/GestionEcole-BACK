const router = require("express").Router();
const path = require("path");
const fs = require("fs").promises;

router.get("/:name", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "../", "files", req.params.name);
    // Read the contents of the file
    const fileContent = await fs.readFile(filePath);
    // Set the content type header of the response to the user's profile picture content type
    const fileName = req.params.name.split("~")[1];
    res.set("Content-Disposition", `attachment; fileName="${fileName}"`);
    res.end(fileContent);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
