
const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null
    },

    jobRole: {
      type: String,
      required: true,
      trim: true
    },

    experience: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress"
    },

    rounds: [
      {
        roundType: {
          type: String,
          enum: [
            "aptitude_questions",
            "technical_questions",
            "coding_questions",
            "hr_questions"
          ],
          required: true
        },

        status: {
          type: String,
          enum: ["not-started", "in-progress", "completed"],
          default: "not-started"
        },

        totalQuestions: {
          type: Number,
          default: 0
        },

        answeredQuestions: {
          type: Number,
          default: 0
        },

        completedAt: {
          type: Date,
          default: null
        }
      }
    ],

    startedAt: {
      type: Date,
      default: Date.now
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

interviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Interview", interviewSchema);
