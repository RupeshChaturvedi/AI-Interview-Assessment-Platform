
import { useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

import {
  BrainCircuit,
  BookOpen,
  Code,
  MessageCircle,
  Calculator,
  Play,
  ArrowLeft,
  ArrowRight,
  Mic,
  MicOff,
  CheckCircle,
  LoaderCircle
} from "lucide-react";

import "./QuestionGenerator.css";

const API_URL = "http://localhost:5000/api/resume";
const INTERVIEW_API_URL = "http://localhost:5000/api/interviews";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

const ROUND_CONFIG = {
  aptitude_questions: {
    title: "Aptitude & Reasoning",
    description: "Test your logical thinking and problem-solving skills.",
    count: 15,
    icon: Calculator
  },
  technical_questions: {
    title: "Technical Interview",
    description: "Answer questions based on your skills and projects.",
    count: 10,
    icon: BookOpen
  },
  coding_questions: {
    title: "Coding Assessment",
    description: "Solve programming problems using your preferred language.",
    count: 5,
    icon: Code
  },
  hr_questions: {
    title: "HR Interview",
    description: "Practice real-world HR and behavioral questions.",
    count: 10,
    icon: MessageCircle
  }
};

const LANGUAGES = {
  JavaScript: "javascript",
  Python: "python",
  C: "c",
  "C++": "cpp",
  Java: "java"
};

const STARTER_CODE = {
  JavaScript:
    "// Write your JavaScript solution here\n\nfunction solution() {\n  \n}",
  Python:
    "# Write your Python solution here\n\ndef solution():\n    pass\n\nif __name__ == \"__main__\":\n    result = solution()\n    print(result)",
  C:
    "#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    return 0;\n}",
  "C++":
    "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ solution here\n    return 0;\n}",
  Java:
    "public class Main {\n    public static void main(String[] args) {\n        // Write your Java solution here\n    }\n}"
};

function QuestionGenerator({ resumeAnalysis }) {
  const [jobRole, setJobRole] = useState("Software Developer");
  const [experience, setExperience] = useState("Fresher");

  const [interviewId, setInterviewId] = useState(null);

  const [selectedRound, setSelectedRound] = useState(null);
  const [questionsByRound, setQuestionsByRound] = useState({});
  const [completedRounds, setCompletedRounds] = useState({});
  const [loadingRound, setLoadingRound] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluatedRound, setEvaluatedRound] = useState("");

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [language, setLanguage] = useState("JavaScript");
  const [code, setCode] = useState(STARTER_CODE.JavaScript);
  const [submittedCodes, setSubmittedCodes] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  // Restore interview data from MongoDB after refresh
  useEffect(() => {
    const restoreInterviewProgress = async () => {
      const activeId =
        interviewId || localStorage.getItem("activeInterviewId");

      if (!activeId) return;

      try {
        const response = await axios.get(
          `${INTERVIEW_API_URL}/${activeId}/progress`,
          getAuthConfig()
        );

        if (!response.data?.success) {
          throw new Error("Unable to restore interview progress.");
        }

        const { interview, progress } = response.data;

        if (!interview || !progress) return;

        setInterviewId(interview._id);
        localStorage.setItem("activeInterviewId", interview._id);

        if (interview.jobRole) {
          setJobRole(interview.jobRole);
        }

        if (interview.experience) {
          setExperience(interview.experience);
        }

        const restoredQuestions = progress.questionsByRound || {};
        setQuestionsByRound(restoredQuestions);

        setAnswers(progress.answers || {});
        setSelectedOptions(progress.selectedOptions || {});
        setSubmittedCodes(progress.submittedCodes || {});

        const completed = {};

        (interview.rounds || []).forEach((round) => {
          if (round.status === "completed") {
            completed[round.roundType] = true;
          }
        });

        setCompletedRounds(completed);

      } catch (err) {
        console.error("Restore Interview Error:", err);

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to restore interview progress."
        );
      }
    };

    restoreInterviewProgress();
  }, [interviewId]);

  const currentQuestions = selectedRound
    ? questionsByRound[selectedRound] || []
    : [];

  const currentQuestion = currentQuestions[currentQuestionIndex];

  const totalQuestions = Object.values(ROUND_CONFIG).reduce(
    (total, round) => total + round.count,
    0
  );

  // Count answered questions
  const countAnswered = (roundType, data = {}) => {
    const currentAnswers = data.answers ?? answers;
    const currentOptions = data.selectedOptions ?? selectedOptions;
    const currentCodes = data.submittedCodes ?? submittedCodes;

    const questions = questionsByRound[roundType] || [];

    return questions.filter((_, index) => {
      const key = `${roundType}_${index}`;

      if (roundType === "aptitude_questions") {
        return Boolean(currentOptions[key]);
      }

      if (roundType === "coding_questions") {
        return Boolean(currentCodes[key]?.code?.trim());
      }

      return Boolean(currentAnswers[key]?.trim());
    }).length;
  };

  const answeredCount = (roundType) => {
    return countAnswered(roundType);
  };

  // Create a new interview
  const createNewInterview = async () => {
    try {
      const response = await axios.post(
        INTERVIEW_API_URL,
        {
          jobRole,
          experience
        },
        getAuthConfig()
      );

      if (!response.data?.success || !response.data?.interview?._id) {
        throw new Error(
          response.data?.message || "Interview could not be created."
        );
      }

      const newInterviewId = response.data.interview._id;

      setInterviewId(newInterviewId);

      localStorage.setItem(
        "activeInterviewId",
        newInterviewId
      );

      return newInterviewId;

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to create interview."
      );

      return null;
    }
  };

  // Save round progress in MongoDB
  const saveRoundProgress = async (
    roundType,
    updatedData = {},
    status = "in-progress"
  ) => {
    const activeId =
      interviewId || localStorage.getItem("activeInterviewId");

    if (!activeId) {
      throw new Error(
        "Interview ID not found. Please start the interview again."
      );
    }

    const payload = {
      roundType,
      answers: updatedData.answers ?? answers,
      selectedOptions:
        updatedData.selectedOptions ?? selectedOptions,
      submittedCodes:
        updatedData.submittedCodes ?? submittedCodes,
      answeredQuestions:
        updatedData.answeredQuestions ??
        countAnswered(roundType, updatedData),
      status
    };

    const response = await axios.put(
      `${INTERVIEW_API_URL}/${activeId}/progress`,
      payload,
      getAuthConfig()
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Progress could not be saved."
      );
    }

    return response.data;
  };

  // Generate questions and save them in MongoDB
  const handleGenerateRound = async (roundType) => {
    if (!resumeAnalysis) {
      setError("Please analyze your resume first.");
      return;
    }

    setError("");
    setLoadingRound(roundType);

    try {
      let activeInterviewId = interviewId;

      if (!activeInterviewId) {
        activeInterviewId = await createNewInterview();
      }

      if (!activeInterviewId) {
        throw new Error(
          "Could not start an interview. Please try again."
        );
      }

      const response = await axios.post(
        `${API_URL}/generate-round`,
        {
          resume_analysis: resumeAnalysis,
          job_role: jobRole,
          experience,
          round_type: roundType
        },
        {
          timeout: 300000
        }
      );

      if (
        !response.data?.success ||
        !Array.isArray(response.data.questions)
      ) {
        throw new Error("Invalid questions response received.");
      }

      await axios.put(
        `${INTERVIEW_API_URL}/${activeInterviewId}/questions/${roundType}`,
        {
          questions: response.data.questions
        },
        getAuthConfig()
      );

      setQuestionsByRound((prev) => ({
        ...prev,
        [roundType]: response.data.questions
      }));

      setCurrentQuestionIndex(0);
      setSelectedRound(roundType);
      setLanguage("JavaScript");
      setCode(STARTER_CODE.JavaScript);
      setVoiceStatus("");
      setError("");

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Unable to generate questions. Please try again."
      );
    } finally {
      setLoadingRound(null);
    }
  };

  // Update technical or HR answer
  const handleAnswerChange = (value) => {
    const key = `${selectedRound}_${currentQuestionIndex}`;

    setAnswers((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Select aptitude option
  const handleOptionSelect = async (option) => {
    const key = `${selectedRound}_${currentQuestionIndex}`;

    const updatedOptions = {
      ...selectedOptions,
      [key]: option
    };

    setSelectedOptions(updatedOptions);
    setError("");
    setSaving(true);

    try {
      const count = countAnswered(selectedRound, {
        selectedOptions: updatedOptions
      });

      await saveRoundProgress(selectedRound, {
        selectedOptions: updatedOptions,
        answeredQuestions: count
      });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to save your answer."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    setCode(STARTER_CODE[value]);
  };

  // Submit coding answer
  const handleSubmitCode = async () => {
    const key = `${selectedRound}_${currentQuestionIndex}`;

    if (!code.trim()) {
      setError("Please write your code before submitting.");
      return;
    }

    const updatedCodes = {
      ...submittedCodes,
      [key]: {
        code,
        language
      }
    };

    setSubmittedCodes(updatedCodes);
    setError("");
    setSaving(true);

    try {
      const count = countAnswered(selectedRound, {
        submittedCodes: updatedCodes
      });

      await saveRoundProgress(selectedRound, {
        submittedCodes: updatedCodes,
        answeredQuestions: count
      });

      setVoiceStatus("Code submitted and saved successfully.");

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Code could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  // Speech recognition
  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus(
        "Speech recognition is not supported. Please type your answer."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening... Speak your answer.");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
      }

      handleAnswerChange(transcript.trim());
    };

    recognition.onerror = () => {
      setVoiceStatus("Microphone error. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus("Voice input stopped.");
    };

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
    }
  };

  // Save progress before moving to next question
  const handleNextQuestion = async () => {
    setError("");
    setSaving(true);

    try {
      const count = countAnswered(selectedRound);

      await saveRoundProgress(selectedRound, {
        answers,
        selectedOptions,
        submittedCodes,
        answeredQuestions: count
      });

      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setVoiceStatus("");
      }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Answer could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Save progress before moving to previous question
  const handlePreviousQuestion = async () => {
    if (currentQuestionIndex <= 0) return;

    setError("");
    setSaving(true);

    try {
      await saveRoundProgress(selectedRound, {
        answers,
        selectedOptions,
        submittedCodes,
        answeredQuestions: countAnswered(selectedRound)
      });

      setCurrentQuestionIndex((prev) => prev - 1);
      setVoiceStatus("");

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Progress could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  // Complete round and request evaluation
  const handleCompleteRound = async () => {
    if (!selectedRound) return;

    setError("");
    setSaving(true);

    try {
      await saveRoundProgress(
        selectedRound,
        {
          answers,
          selectedOptions,
          submittedCodes,
          answeredQuestions: countAnswered(selectedRound)
        },
        "completed"
      );

      const activeId =
        interviewId || localStorage.getItem("activeInterviewId");

      if (!activeId) {
        throw new Error("Interview ID not found.");
      }

      const response = await axios.post(
        `${INTERVIEW_API_URL}/${activeId}/evaluate`,
        { roundType: selectedRound },
        getAuthConfig()
      );

      const result = response.data?.evaluationResult;

      if (!result) {
        throw new Error("Evaluation result was not received.");
      }

      setEvaluationResult(result);
      setEvaluatedRound(selectedRound);

      setCompletedRounds((prev) => ({
        ...prev,
        [selectedRound]: true
      }));

      setSelectedRound(null);
      setCurrentQuestionIndex(0);
      setVoiceStatus("");
      setError("");

    } catch (err) {
      console.error("Round Evaluation Error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Round could not be completed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Save progress when returning to round selection
  const handleBackToRounds = async () => {
    setError("");
    setSaving(true);

    try {
      await saveRoundProgress(selectedRound, {
        answers,
        selectedOptions,
        submittedCodes,
        answeredQuestions: countAnswered(selectedRound)
      });

      setSelectedRound(null);
      setCurrentQuestionIndex(0);
      setVoiceStatus("");

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Progress could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  const getQuestionText = (question) => {
    if (typeof question === "string") {
      return question;
    }

    return (
      question?.question ||
      question?.title ||
      question?.problem ||
      "Question not available"
    );
  };

  const getOptions = (question) => {
    if (!question) return [];

    if (Array.isArray(question.options)) {
      return question.options;
    }

    return [];
  };

  const currentAnswerKey =
    `${selectedRound}_${currentQuestionIndex}`;

  const savedAnswer = answers[currentAnswerKey] || "";
  const savedOption = selectedOptions[currentAnswerKey] || "";
  const codeSubmitted = submittedCodes[currentAnswerKey];

  return (
    <section className="question-generator">

      <div className="question-generator-heading">
        <BrainCircuit size={30} color="#60A5FA" />

        <div>
          <h2>AI Mock Interview</h2>
          <p>
            Prepare for your interview with AI-powered assessments.
          </p>
        </div>
      </div>

      {!selectedRound && !evaluationResult && (
        <>

          <div className="round-selection-heading">
            <div>
              <h2>Choose Your Interview Round</h2>
              <p>
                Questions are personalized using your resume analysis.
              </p>
            </div>
          </div>

          {error && (
            <div className="question-error">
              {error}
            </div>
          )}

          <div className="round-cards">

            {Object.entries(ROUND_CONFIG).map(([key, round]) => {
              const Icon = round.icon;
              const isCompleted = Boolean(completedRounds[key]);
              const isLoading = loadingRound === key;

              return (
                <div className="round-card" key={key}>

                  <div className="round-card-top">
                    <div className="round-icon">
                      <Icon size={25} />
                    </div>

                    {isCompleted && (
                      <span className="round-completed">
                        <CheckCircle size={15} />
                        Completed
                      </span>
                    )}
                  </div>

                  <h3>{round.title}</h3>
                  <p>{round.description}</p>

                  <div className="round-card-meta">
                    <span>{round.count} Questions</span>
                    <span>{answeredCount(key)} Answered</span>
                  </div>

                  <button
                    className={`round-start-btn ${
                      isCompleted ? "round-disabled" : ""
                    }`}
                    onClick={() => handleGenerateRound(key)}
                    disabled={
                      Boolean(loadingRound) ||
                      isCompleted ||
                      saving
                    }
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle
                          className="spin-icon"
                          size={17}
                        />
                        Generating Questions...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle size={17} />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play size={17} />
                        Start Round
                      </>
                    )}
                  </button>

                </div>
              );
            })}

          </div>

          <div className="round-total-info">
            <strong>{totalQuestions} Questions</strong>
            <span>
              Across 4 independent interview rounds
            </span>
          </div>
        </>
      )}

      {!selectedRound && evaluationResult && (
        <div className="evaluation-page">

          <div className="evaluation-header">
            <div className="evaluation-icon">
              <BrainCircuit size={30} />
            </div>

            <div>
              <span className="evaluation-eyebrow">
                ASSESSMENT COMPLETED
              </span>

              <h2>Round Evaluation Report</h2>
              <p>{ROUND_CONFIG[evaluatedRound]?.title}</p>
            </div>
          </div>

          {evaluationResult.evaluation_type && (
            <div className="evaluation-section">
              <h3>
                <Code size={20} />
                Coding Review Method
              </h3>
              <p>
                This score is based on AI review of your submitted code,
                logic, complexity, code quality and edge-case handling.
                Your code was not executed, so automated test-case results
                are not included.
              </p>
            </div>
          )}

          <div className="evaluation-score-card">
            <div className="score-label">
              YOUR PERFORMANCE
            </div>

            <div className="score-value">
              {evaluationResult.percentage ??
                evaluationResult.total_score ??
                evaluationResult.score ??
                "--"}

              {evaluationResult.percentage != null ? "%" : ""}
            </div>

            <p>
              {evaluationResult.total_score != null &&
                evaluationResult.max_score != null
                ? `Score: ${evaluationResult.total_score}/${evaluationResult.max_score}`
                : "AI Evaluated Performance"}
            </p>
          </div>

          {evaluatedRound === "aptitude_questions" && (
            <div className="evaluation-stats">

              <div className="evaluation-stat">
                <span className="stat-number">
                  {evaluationResult.correctAnswers ?? "--"}
                </span>
                <span className="stat-title">
                  Correct Answers
                </span>
              </div>

              <div className="evaluation-stat">
                <span className="stat-number">
                  {evaluationResult.wrongAnswers ?? "--"}
                </span>
                <span className="stat-title">
                  Wrong Answers
                </span>
              </div>

              <div className="evaluation-stat">
                <span className="stat-number">
                  {evaluationResult.totalQuestions ?? "--"}
                </span>
                <span className="stat-title">
                  Total Questions
                </span>
              </div>

            </div>
          )}

          {(evaluationResult.feedback ||
            evaluationResult.overall_feedback ||
            evaluationResult.summary) && (
            <div className="evaluation-section">
              <h3>
                <MessageCircle size={20} />
                AI Performance Feedback
              </h3>

              <p>
                {evaluationResult.feedback ||
                  evaluationResult.overall_feedback ||
                  evaluationResult.summary}
              </p>
            </div>
          )}

          {Array.isArray(evaluationResult.strengths) && (
            <div className="evaluation-section">
              <h3>
                <CheckCircle size={20} />
                Your Strengths
              </h3>

              <ul>
                {evaluationResult.strengths.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(evaluationResult.improvements) && (
            <div className="evaluation-section">
              <h3>
                <BrainCircuit size={20} />
                Areas to Improve
              </h3>

              <ul>
                {evaluationResult.improvements.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(evaluationResult.question_results) &&
            evaluationResult.question_results.length > 0 && (
            <div className="evaluation-section">
              <h3>Question-wise Evaluation</h3>

              {evaluationResult.question_results.map((item, index) => (
                <div className="evaluation-question" key={index}>
                  <strong>
                    Question {index + 1}: {item.question || ""}
                  </strong>

                  <p>
                    {item.feedback || "No feedback provided."}
                  </p>

                  <span>
                    Score: {item.score ?? "--"}/{item.max_score ?? 10}
                  </span>

                  {item.score_breakdown && (
                    <div className="question-feedback-list">
                      <strong>Score Breakdown</strong>
                      <ul>
                        <li>
                          Correctness: {item.score_breakdown.correctness ?? 0}/8
                        </li>
                        <li>
                          Logic: {item.score_breakdown.logic ?? 0}/4
                        </li>
                        <li>
                          Complexity: {item.score_breakdown.complexity ?? 0}/3
                        </li>
                        <li>
                          Code Quality: {item.score_breakdown.code_quality ?? 0}/3
                        </li>
                        <li>
                          Edge Cases: {item.score_breakdown.edge_cases ?? 0}/2
                        </li>
                      </ul>
                    </div>
                  )}

                  {Array.isArray(item.strengths) &&
                    item.strengths.length > 0 && (
                    <div className="question-feedback-list">
                      <strong>Strengths</strong>

                      <ul>
                        {item.strengths.map((strength, strengthIndex) => (
                          <li key={strengthIndex}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(item.improvements) &&
                    item.improvements.length > 0 && (
                    <div className="question-feedback-list">
                      <strong>Improvements</strong>

                      <ul>
                        {item.improvements.map((improvement, improvementIndex) => (
                          <li key={improvementIndex}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="evaluation-actions">
            <button
              className="evaluation-back-btn"
              onClick={() => {
                setEvaluationResult(null);
                setEvaluatedRound("");
              }}
            >
              <ArrowLeft size={18} />
              Back to Interview Rounds
            </button>
          </div>

        </div>
      )}

      {selectedRound && currentQuestion && (
        <div className="interview-mode">

          <div className="interview-mode-header">
            <div>
              <h2>{ROUND_CONFIG[selectedRound].title}</h2>
              <p>Personalized questions based on your resume</p>
            </div>

            <button
              className="exit-interview-btn"
              onClick={handleBackToRounds}
              disabled={saving}
            >
              <ArrowLeft size={16} />
              Back to Rounds
            </button>
          </div>

          <div className="interview-progress-info">
            <span>Round Progress</span>

            <strong>
              {currentQuestionIndex + 1} / {currentQuestions.length}
            </strong>
          </div>

          <div className="interview-progress-track">
            <div
              className="interview-progress-fill"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) /
                    currentQuestions.length) * 100
                }%`
              }}
            />
          </div>

          <div className="current-question-card">

            <span className="current-question-category">
              {ROUND_CONFIG[selectedRound].title} · Question{" "}
              {currentQuestionIndex + 1}
            </span>

            <h2>{getQuestionText(currentQuestion)}</h2>

            {currentQuestion.topic && (
              <p>Topic: {currentQuestion.topic}</p>
            )}

            {currentQuestion.difficulty && (
              <p>Difficulty: {currentQuestion.difficulty}</p>
            )}

            {selectedRound === "coding_questions" && (
              <>
                {currentQuestion.constraints && (
                  <p>
                    <strong>Constraints:</strong>{" "}
                    {Array.isArray(currentQuestion.constraints)
                      ? currentQuestion.constraints.join(", ")
                      : currentQuestion.constraints}
                  </p>
                )}

                {currentQuestion.input_format && (
                  <p>
                    <strong>Input:</strong> {currentQuestion.input_format}
                  </p>
                )}

                {currentQuestion.output_format && (
                  <p>
                    <strong>Output:</strong> {currentQuestion.output_format}
                  </p>
                )}

                {Array.isArray(currentQuestion.examples) &&
                  currentQuestion.examples.map((example, index) => (
                    <div key={index} className="coding-example">
                      <strong>Example {index + 1}</strong>
                      <p>Input: {example.input}</p>
                      <p>Output: {example.output}</p>
                      {example.explanation && (
                        <p>Explanation: {example.explanation}</p>
                      )}
                    </div>
                  ))}
              </>
            )}

          </div>

          {error && (
            <div className="question-error">
              {error}
            </div>
          )}

          {/* Aptitude MCQ */}

          {selectedRound === "aptitude_questions" && (
            <div className="round-answer-area">
              <h3>Select your answer</h3>

              <div className="aptitude-options">
                {getOptions(currentQuestion).map((option, index) => {
                  const optionText =
                    typeof option === "string"
                      ? option
                      : option.text ||
                        option.option ||
                        option.label;

                  return (
                    <button
                      key={index}
                      className={`aptitude-option ${
                        savedOption === optionText
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleOptionSelect(optionText)}
                      disabled={saving}
                    >
                      <span>
                        {String.fromCharCode(65 + index)}
                      </span>

                      {optionText}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical and HR voice answers */}

          {(selectedRound === "technical_questions" ||
            selectedRound === "hr_questions") && (
            <div className="round-answer-area">

              <h3>Your spoken answer</h3>

              <button
                className={`voice-answer-btn ${
                  isListening ? "voice-active" : ""
                }`}
                onClick={handleVoiceInput}
              >
                {isListening ? (
                  <MicOff size={18} />
                ) : (
                  <Mic size={18} />
                )}

                {isListening
                  ? "Stop Microphone"
                  : "Answer Using Microphone"}
              </button>

              {voiceStatus && (
                <p className="voice-status">
                  {voiceStatus}
                </p>
              )}

              <textarea
                rows="6"
                value={savedAnswer}
                onChange={(e) =>
                  handleAnswerChange(e.target.value)
                }
                placeholder="Your spoken answer will appear here. You can edit the transcript if needed."
              />

            </div>
          )}

          {/* Coding Workspace */}

          {selectedRound === "coding_questions" && (
            <div className="coding-workspace">

              <div className="coding-workspace-header">
                <div>
                  <h3>
                    <Code size={20} />
                    Coding Workspace
                  </h3>

                  <p>
                    Write your solution in your preferred language.
                  </p>
                </div>
              </div>

              <div className="coding-language-field">
                <label htmlFor="programming-language">
                  Programming Language
                </label>

                <select
                  id="programming-language"
                  value={language}
                  onChange={(e) =>
                    handleLanguageChange(e.target.value)
                  }
                >
                  {Object.keys(LANGUAGES).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="coding-editor">
                <Editor
                  height="400px"
                  language={LANGUAGES[language]}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 15 }
                  }}
                />
              </div>

              <div className="code-submit-section">

                {codeSubmitted && (
                  <div className="code-submit-status">
                    <CheckCircle size={17} />
                    Code submitted
                  </div>
                )}

                <button
                  className="submit-code-btn"
                  onClick={handleSubmitCode}
                  disabled={saving}
                >
                  <CheckCircle size={17} />
                  {saving ? "Saving..." : "Submit Code"}
                </button>

                <p className="code-submit-note">
                  Note: Code is saved and reviewed by AI.
                  Actual code execution and automated test-case evaluation
                  are not implemented yet.
                </p>

              </div>

            </div>
          )}

          <div className="interview-navigation">

            <button
              className="interview-nav-btn"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0 || saving}
            >
              <ArrowLeft size={17} />
              Previous
            </button>

            {currentQuestionIndex <
            currentQuestions.length - 1 ? (
              <button
                className="interview-nav-btn next-question-btn"
                onClick={handleNextQuestion}
                disabled={saving}
              >
                {saving ? "Saving..." : "Next Question"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="finish-interview-btn"
                onClick={handleCompleteRound}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle
                      className="spin-icon"
                      size={18}
                    />
                    Saving Round...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Complete Round
                  </>
                )}
              </button>
            )}

          </div>

        </div>
      )}

    </section>
  );
}

export default QuestionGenerator;
