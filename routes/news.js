// routes/news.js
const express = require("express");
const router = express.Router();
const News = require("../models/news");
const { upload } = require("../middlewares/upload");

router.get("/", async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    // Update the user's profile picture with the uploaded file information
    const image = req.file.filename;
    const { title, description } = req.body;
    const news = new News({ title, description, image });
    const savedNews = await news.save();
    res.status(201).json(savedNews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    let image = req.file ? req.file.filename : undefined;

    const updateFields = { title, description };
    if (image) {
      updateFields.image = image;
    }

    const news = await News.findOneAndUpdate(
      { _id: req.params.id },
      updateFields,
      { new: true }
    );

    res.status(201).json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const news = await News.findByIdAndRemove({
      _id: req.params.id,
    });
    if (!news) return res.status(404).send("news not found");
    return res.status(200).send(news);
  } catch (error) {
    return res.status(500).send(`Internal server error: ${error.message}`);
  }
});

module.exports = router;
