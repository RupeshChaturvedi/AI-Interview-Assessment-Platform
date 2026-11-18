
const axios = require("axios");
const Interview = require("../models/Interview");
const InterviewProgress = require("../models/InterviewProgress");


// ----------------------------------
// GET LOGGED-IN USER ID
// ----------------------------------

const getUserId = (req) =>
  req.user?.id || req.user?._id || req.user?.userId;


// ----------------------------------
// 1. CREATE INTERVIEW
// ----------------------------------

const createInterview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { jobRole, experience, resumeId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    if (!jobRole || !experience) {
      return res.status(400).json({
        success: false,
        message: "Job role and experience are required."
      });
    }

    const interview = await Interview.create({
      userId,
      jobRole,
      experience,
      resumeId: resumeId || null,
      rounds: [
        { roundType: "aptitude_questions" },
        { roundType: "technical_questions" },
        { roundType: "coding_questions" },
        { roundType: "hr_questions" }
      ]
    });

    await InterviewProgress.create({
      userId,
      interviewId: interview._id
    });

    return res.status(201).json({
      success: true,
      message: "Interview session created successfully.",
      interview
    });

  } catch (error) {
    console.error("Create Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create interview session."
    });
  }
};


// ----------------------------------
// 2. SAVE INTERVIEW PROGRESS
// ----------------------------------

const saveInterviewProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { interviewId } = req.params;

    const {
      roundType,
      answers,
      selectedOptions,
      submittedCodes,
      answeredQuestions,
      status
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found."
      });
    }

    const progress = await InterviewProgress.findOne({
      interviewId,
      userId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Interview progress not found."
      });
    }

    const round = interview.rounds.find(
      (item) => item.roundType === roundType
    );

    if (!round) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview round."
      });
    }

    if (round.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "This round is already completed."
      });
    }

    // Save text answers
    if (answers) {
      for (const [key, value] of Object.entries(answers)) {
        progress.answers.set(key, value);
      }
    }

    // Save aptitude selections
    if (selectedOptions) {
      for (const [key, value] of Object.entries(selectedOptions)) {
        progress.selectedOptions.set(key, value);
      }
    }

    // Save coding submissions
    if (submittedCodes) {
      for (const [key, value] of Object.entries(submittedCodes)) {
        progress.submittedCodes.set(key, value);
      }
    }

    if (
      answeredQuestions !== undefined &&
      answeredQuestions !== null
    ) {
      const count = Number(answeredQuestions);

      if (Number.isInteger(count) && count >= 0) {
        round.answeredQuestions = count;
      }
    }

    // Mark round completed
    if (status === "completed") {
      round.status = "completed";
      round.completedAt = new Date();

      if (!progress.completedRounds.includes(roundType)) {
        progress.completedRounds.push(roundType);
      }
    } else {
      round.status = "in-progress";
    }

    progress.roundProgress.set(
      roundType,
      round.answeredQuestions || 0
    );

    // Check whether all four rounds are completed
    const allRoundsCompleted =
      interview.rounds.length === 4 &&
      interview.rounds.every(
        (item) => item.status === "completed"
      );

    if (allRoundsCompleted) {
      interview.status = "completed";

      if (!interview.completedAt) {
        interview.completedAt = new Date();
      }
    }

    await Promise.all([
      progress.save(),
      interview.save()
    ]);

    return res.status(200).json({
      success: true,
      message: "Interview progress saved successfully.",
      interviewStatus: interview.status,
      progress
    });

  } catch (error) {
    console.error("Save Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save interview progress."
    });
  }
};


// ----------------------------------
// 3. GET INTERVIEW PROGRESS
// ----------------------------------

const getInterviewProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { interviewId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found."
      });
    }

    const progress = await InterviewProgress.findOne({
      interviewId,
      userId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Interview progress not found."
      });
    }

    return res.status(200).json({
      success: true,
      interview,
      progress
    });

  } catch (error) {
    console.error("Get Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch interview progress."
    });
  }
};


// ----------------------------------
// 4. EVALUATE INTERVIEW ROUND
// ----------------------------------

const evaluateRound = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { interviewId } = req.params;
    const { roundType } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    const allowedRounds = [
      "aptitude_questions",
      "technical_questions",
      "coding_questions",
      "hr_questions"
    ];

    if (!allowedRounds.includes(roundType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation round."
      });
    }

    // Verify interview ownership
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
      interviewId,
      userId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Interview progress not found."
      });
    }

    const round = interview.rounds.find(
      (item) => item.roundType === roundType
    );

    if (!round || round.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Complete the interview round before evaluation."
      });
    }

    const questions =
      progress.questionsByRound.get(roundType) || [];

    if (!questions.length) {
      return res.status(400).json({
        success: false,
        message: "Questions not found."
      });
    }

    let evaluationResult;

    // ----------------------------------
    // APTITUDE EVALUATION
    // ----------------------------------

    if (roundType === "aptitude_questions") {
      const selectedOptions = Object.fromEntries(
        progress.selectedOptions
      );

      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unanswered = 0;

      const normalize = (value) =>
        String(value ?? "").trim().toLowerCase();

      questions.forEach((question, index) => {
        const answerKey = `${roundType}_${index}`;
        const selected = selectedOptions[answerKey];

        if (!selected) {
          unanswered++;
          return;
        }

        if (
          normalize(selected) ===
          normalize(question.correct_answer)
        ) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      });

      const totalQuestions = questions.length;

      const percentage = Math.round(
        (correctAnswers / totalQuestions) * 100
      );

      evaluationResult = {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        score: correctAnswers,
        total_score: correctAnswers,
        max_score: totalQuestions,
        percentage,
        overall_feedback:
          percentage >= 80
            ? "Excellent aptitude performance."
            : percentage >= 60
            ? "Good performance. Keep practicing."
            : percentage >= 40
            ? "Average performance. Improve your accuracy."
            : "More practice is required. Revise basic concepts.",
        strengths:
          percentage >= 70
            ? ["Good problem-solving accuracy."]
            : [],
        improvements:
          percentage < 70
            ? [
                "Practice quantitative aptitude.",
                "Improve calculation speed.",
                "Revise logical reasoning concepts."
              ]
            : [
                "Continue practicing advanced questions."
              ]
      };
    }

    // ----------------------------------
    // TECHNICAL AND HR EVALUATION
    // ----------------------------------

    else if (
      roundType === "technical_questions" ||
      roundType === "hr_questions"
    ) {
      const answers = Object.fromEntries(
        progress.answers
      );

      const aiServiceUrl = (
        process.env.AI_SERVICE_URL ||
        "http://localhost:8000"
      ).replace(/\/+$/, "");

      const aiResponse = await axios.post(
        `${aiServiceUrl}/evaluate-text`,
        {
          round_type: roundType,
          questions,
          answers
        },
        {
          timeout: 120000
        }
      );

      if (
        !aiResponse.data?.success ||
        !aiResponse.data?.evaluation
      ) {
        throw new Error(
          "Invalid text evaluation response from AI service."
        );
      }

      evaluationResult = aiResponse.data.evaluation;
    }

    // ----------------------------------
    // CODING EVALUATION
    // ----------------------------------

    else if (roundType === "coding_questions") {
      const submissions = Object.fromEntries(
        progress.submittedCodes
      );

      const aiServiceUrl = (
        process.env.AI_SERVICE_URL ||
        "http://localhost:8000"
      ).replace(/\/+$/, "");

      const aiResponse = await axios.post(
        `${aiServiceUrl}/evaluate-coding`,
        {
          questions,
          submissions
        },
        {
          timeout: 180000
        }
      );

      if (
        !aiResponse.data?.success ||
        !aiResponse.data?.evaluation
      ) {
        throw new Error(
          "Invalid coding evaluation response from AI service."
        );
      }

      evaluationResult = aiResponse.data.evaluation;
    }

    // ----------------------------------
    // SAVE EVALUATION RESULT
    // ----------------------------------

    if (!progress.evaluationResults) {
      progress.evaluationResults = new Map();
    }

    progress.evaluationResults.set(
      roundType,
      evaluationResult
    );

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Round evaluated successfully.",
      roundType,
      evaluationResult
    });

  } catch (error) {
    console.error(
      "Round Evaluation Error:",
      error.response?.data || error.message || error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to evaluate round.",
      error:
        error.response?.data?.detail ||
        error.message ||
        "Unknown evaluation error."
    });
  }
};


// ----------------------------------
// 5. GET DASHBOARD STATISTICS
// ----------------------------------

const getDashboardStats = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    // Fetch completed interviews of logged-in user
    const interviews = await Interview.find({
      userId,
      status: "completed"
    }).sort({
      completedAt: -1
    });

    const interviewIds = interviews.map(
      (item) => item._id
    );

    const progressRecords = await InterviewProgress.find({
      userId,
      interviewId: { $in: interviewIds }
    });

    const progressMap = new Map();

    progressRecords.forEach((progress) => {
      progressMap.set(
        String(progress.interviewId),
        progress
      );
    });

    // Extract score percentage
    const getPercentage = (result) => {
      if (!result || typeof result !== "object") {
        return null;
      }

      if (
        typeof result.percentage === "number" &&
        Number.isFinite(result.percentage)
      ) {
        return Math.max(
          0,
          Math.min(100, result.percentage)
        );
      }

      const score = Number(
        result.score ?? result.total_score
      );

      const maxScore = Number(result.max_score);

      if (
        Number.isFinite(score) &&
        Number.isFinite(maxScore) &&
        maxScore > 0
      ) {
        return Math.max(
          0,
          Math.min(100, (score / maxScore) * 100)
        );
      }

      return null;
    };

    // Calculate each interview's average score
    const interviewResults = interviews.map((interview) => {
      const progress = progressMap.get(
        String(interview._id)
      );

      const evaluationResults =
        progress?.evaluationResults || new Map();

      const roundScores = [];

      const roundTypes = [
        "aptitude_questions",
        "technical_questions",
        "coding_questions",
        "hr_questions"
      ];

      roundTypes.forEach((roundType) => {
        const result = evaluationResults.get
          ? evaluationResults.get(roundType)
          : evaluationResults[roundType];

        const percentage = getPercentage(result);

        if (percentage !== null) {
          roundScores.push(percentage);
        }
      });

      const averageScore = roundScores.length
        ? roundScores.reduce(
            (sum, value) => sum + value,
            0
          ) / roundScores.length
        : null;

      return {
        interview,
        averageScore
      };
    });

    // Ignore interviews without evaluation scores
    const scoredInterviews = interviewResults.filter(
      (item) => item.averageScore !== null
    );

    // Overall average score
    const averageScore = scoredInterviews.length
      ? Math.round(
          scoredInterviews.reduce(
            (sum, item) => sum + item.averageScore,
            0
          ) / scoredInterviews.length
        )
      : 0;

    // ----------------------------------
    // TOTAL PRACTICE TIME
    // ----------------------------------

    let totalDurationMs = 0;

    interviews.forEach((interview) => {
      if (
        interview.startedAt &&
        interview.completedAt
      ) {
        const duration =
          new Date(interview.completedAt).getTime() -
          new Date(interview.startedAt).getTime();

        if (duration > 0) {
          totalDurationMs += duration;
        }
      }
    });

    const totalMinutes = Math.floor(
      totalDurationMs / (1000 * 60)
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const practiceTime = `${hours}h ${minutes}m`;

    // ----------------------------------
    // IMPROVEMENT
    // ----------------------------------

    let improvement = null;

    if (scoredInterviews.length >= 2) {
      const latestScore =
        scoredInterviews[0].averageScore;

      const previousScore =
        scoredInterviews[1].averageScore;

      improvement = Math.round(
        latestScore - previousScore
      );
    }

    // ----------------------------------
    // FINAL RESPONSE
    // ----------------------------------

    return res.status(200).json({
      success: true,
      stats: {
        interviewsCompleted: interviews.length,
        averageScore,
        practiceTime,
        improvement
      }
    });

  } catch (error) {
    console.error(
      "Dashboard Stats Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard statistics."
    });
  }
};


// ----------------------------------
// EXPORT CONTROLLERS
// ----------------------------------

module.exports = {
  createInterview,
  saveInterviewProgress,
  getInterviewProgress,
  evaluateRound,
  getDashboardStats
};
