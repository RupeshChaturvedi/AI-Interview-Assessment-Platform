
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  saveGeneratedQuestions
} = require("../controllers/interviewQuestionsController");

const {
  createInterview,
  saveInterviewProgress,
  getInterviewProgress,
  evaluateRound,
  getDashboardStats
} = require("../controllers/interviewProgressController");

// Dashboard statistics
router.get(
  "/stats/dashboard",
  authMiddleware,
  getDashboardStats
);

// Create a new interview
// Dashboard Statistics
router.get(
  "/stats/dashboard",
  authMiddleware,
  getDashboardStats
);
router.post(
  "/",
  authMiddleware,
  createInterview
);

// Save interview progress
router.put(
  "/:interviewId/progress",
  authMiddleware,
  saveInterviewProgress
);

// Get saved interview progress
router.get(
  "/:interviewId/progress",
  authMiddleware,
  getInterviewProgress
);

// Save generated questions for an interview round
router.put(
  "/:interviewId/questions/:roundType",
  authMiddleware,
  saveGeneratedQuestions
);

// Evaluate interview round
router.post(
  "/:interviewId/evaluate",
  authMiddleware,
  evaluateRound
);

module.exports = router;
