const router = require("express").Router();
const path = require("path");
const fs = require("fs").promises;

router.get("/avatar/:name", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "../", "images", req.params.name);
    // Read the contents of the file
    const fileContent = await fs.readFile(filePath);
    // Set the content type header of the response to the user's profile picture content type
    const contentType = "image/" + filePath.split(".").at(-1);
    res.writeHead(200, { "Content-Type": contentType });
    // Send the file contents in the response body
    res.end(fileContent);
  } catch (error) {
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
