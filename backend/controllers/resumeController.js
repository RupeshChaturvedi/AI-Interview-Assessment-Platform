
const axios = require("axios");
const FormData = require("form-data");

// AI Service URL
const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";


// =====================================
// 1. RESUME ANALYSIS CONTROLLER
// =====================================

const analyzeResume = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume first."
      });
    }

    const formData = new FormData();

    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/analyze-resume`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: 5 * 1024 * 1024,
        timeout: 120000
      }
    );

    return res.status(200).json(aiResponse.data);

  } catch (error) {

    console.error(
      "Resume Analysis Error:",
      error.response?.data || error.message
    );

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI Service is currently unavailable."
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "Resume analysis timed out. Please try again."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.detail ||
        "Something went wrong during resume analysis."
    });
  }
};


// =====================================
// 2. OLD COMPLETE QUESTION GENERATION
// =====================================

const generateQuestions = async (req, res) => {
  try {

    const { resume_analysis, job_role, experience } = req.body;

    if (!resume_analysis) {
      return res.status(400).json({
        success: false,
        message: "Resume analysis is required."
      });
    }

    if (!job_role || !job_role.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a job role."
      });
    }

    if (!experience || !experience.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide experience level."
      });
    }

    console.log("Generating Complete Interview Questions...");

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/generate-questions`,
      {
        resume_analysis,
        job_role,
        experience
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 300000
      }
    );

    console.log("Complete Interview Questions Generated!");

    return res.status(200).json(aiResponse.data);

  } catch (error) {

    console.error(
      "Question Generation Error:",
      error.response?.data || error.message
    );

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI Service is currently unavailable."
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "Question generation timed out. Please try again."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.detail ||
        "Something went wrong during question generation."
    });
  }
};


// =====================================
// 3. INDEPENDENT ROUND GENERATION
// =====================================

const generateRound = async (req, res) => {
  try {

    const {
      resume_analysis,
      job_role,
      experience,
      round_type
    } = req.body;

    // Validate resume
    if (!resume_analysis) {
      return res.status(400).json({
        success: false,
        message: "Resume analysis is required."
      });
    }

    // Validate job role
    if (!job_role || !job_role.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a job role."
      });
    }

    // Validate experience
    if (!experience || !experience.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide experience level."
      });
    }

    // Allowed independent rounds
    const allowedRounds = [
      "aptitude_questions",
      "technical_questions",
      "coding_questions",
      "hr_questions"
    ];

    if (!allowedRounds.includes(round_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview round selected."
      });
    }

    console.log(`Generating ${round_type}...`);

    // Connect to Python round-generation API
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/generate-round`,
      {
        resume_analysis,
        job_role,
        experience,
        round_type
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 180000
      }
    );

    console.log(`${round_type} generated successfully!`);

    return res.status(200).json(aiResponse.data);

  } catch (error) {

    console.error(
      "Independent Round Generation Error:",
      error.response?.data || error.message
    );

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI Service is currently unavailable."
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "Round generation timed out. Please try again."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.detail ||
        "Something went wrong while generating this round."
    });
  }
};


// =====================================
// EXPORT CONTROLLERS
// =====================================

module.exports = {
  analyzeResume,
  generateQuestions,
  generateRound
};
