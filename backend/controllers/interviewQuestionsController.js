
const Interview = require("../models/Interview");
const InterviewProgress = require("../models/InterviewProgress");

const saveGeneratedQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { interviewId, roundType } = req.params;
    const { questions } = req.body;

    const allowedRounds = [
      "aptitude_questions",
      "technical_questions",
      "coding_questions",
      "hr_questions"
    ];

    if (!allowedRounds.includes(roundType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview round."
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid questions are required."
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found."
      });
    }

    const progress = await InterviewProgress.findOne({
      userId,
      interviewId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Interview progress not found."
      });
    }

    if (progress.completedRounds.includes(roundType)) {
      return res.status(400).json({
        success: false,
        message: "This round is already completed."
      });
    }

    progress.questionsByRound.set(roundType, questions);

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Generated questions saved successfully."
    });

  } catch (error) {
    console.error("Save Questions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save generated questions."
    });
  }
};

module.exports = { saveGeneratedQuestions };
