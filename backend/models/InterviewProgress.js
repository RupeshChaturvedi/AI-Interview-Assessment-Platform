
const mongoose = require("mongoose");

const interviewProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      default: null
    },

    completedRounds: {
      type: [String],
      default: []
    },

    questionsByRound: {
  type: Map,
  of: [mongoose.Schema.Types.Mixed],
  default: {}
},

    roundProgress: {
      type: Map,
      of: Number,
      default: {}
    },

    answers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    selectedOptions: {
      type: Map,
      of: String,
      default: {}
    },

    submittedCodes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    evaluationResults: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
    }
  },
  { timestamps: true }
);

interviewProgressSchema.index(
  { userId: 1, interviewId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "InterviewProgress",
  interviewProgressSchema
);
