const { google } = require("googleapis");
const fs = require("fs");

const vision = google.vision("v1");

const checkAdultContent = async (req, res, next) => {
  try {
    if (process.env.CHECK_ADULT_CONTENT === "false") {
      return next();
    }
    const imageData = fs.readFileSync(req.file.path);

    const result = await analyzeImage(imageData);

    if (result.adult === "VERY_LIKELY" || result.racy === "VERY_LIKELY") {
      // Handle the case where the image contains adult content
      res.status(400).json({ error: "Image contains adult content" });
    } else {
      // No adult content detected, proceed to store the image in the database
      next();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process image" });
  }
};

module.exports = checkAdultContent;

async function analyzeImage(imageData) {
  const apiKey = process.env.GOOGLE_API_KEY;

  const requestData = {
    requests: [
      {
        image: {
          content: imageData.toString("base64"),
        },
        features: [
          {
            type: "SAFE_SEARCH_DETECTION",
          },
        ],
      },
    ],
  };

  try {
    const response = await vision.images.annotate({
      key: apiKey,
      requestBody: requestData,
    });

    return response.data.responses[0].safeSearchAnnotation;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to analyze image");
  }
}
