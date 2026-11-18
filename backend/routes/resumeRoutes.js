
const express = require("express");

const router = express.Router();

// Import upload middleware
const upload = require("../middleware/uploadMiddleware");

// Import controllers
const {
  analyzeResume,
  generateQuestions,
  generateRound
} = require("../controllers/resumeController");

// Resume Analysis API
router.post(
  "/analyze",
  upload.single("file"),
  analyzeResume
);

// Generate all interview questions (old API)
router.post(
  "/generate-questions",
  generateQuestions
);

// Generate questions for a selected round
router.post(
  "/generate-round",
  generateRound
);

module.exports = router;
