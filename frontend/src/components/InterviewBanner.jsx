import { Play, AudioLines, Bot } from "lucide-react";

function InterviewBanner() {

  const startInterview = () => {
    alert("AI Mock Interview will start soon!");
  };

  return (
    <div className="interview-banner">

      <div className="robot-illustration">
        <div className="robot-glow">
          <Bot size={115} strokeWidth={1.5} />
        </div>
      </div>

      <div className="interview-banner-content">

        <h2>Start Your AI Mock Interview</h2>

        <p>
          Answer questions, get instant feedback
          <br />
          and improve your skills.
        </p>

        <button
          className="start-interview-btn"
          onClick={startInterview}
        >
          <Play size={20} fill="white" />
          Start Interview
        </button>

      </div>

      <div className="audio-wave">
        <AudioLines size={75} />
      </div>

    </div>
  );
}

export default InterviewBanner;