
import { useState } from "react";

import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCards from "./components/StatCards";
import ResumeUpload from "./components/ResumeUpload";
import ResumeAnalysis from "./components/ResumeAnalysis";
import QuestionGenerator from "./components/QuestionGenerator";
import PerformanceOverview from "./components/PerformanceOverview";
import InterviewBanner from "./components/InterviewBanner";
import RecentActivity from "./components/RecentActivity";

import "./App.css";

function App() {
  // Resume analysis will remain only in React state.
  // It will not be restored after page refresh.
  const [analysis, setAnalysis] = useState(() => {
  localStorage.removeItem("activeInterviewId");
  return null;
});

  // Restore login session
  const [token, setToken] = useState(() =>
    localStorage.getItem("token")
  );

  // Restore user details
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // Handle successful login
  const handleLogin = (userData) => {
    setUser(userData);
    setToken(localStorage.getItem("token"));
  };

  // Handle successful resume analysis
  const handleAnalysisSuccess = (analysisData) => {
    setAnalysis(analysisData);
  };

  // Remove old resume analysis
  const handleRemoveResume = () => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove the previous resume analysis?"
    );

    if (!confirmRemove) return;

    localStorage.removeItem("activeInterviewId");
    setAnalysis(null);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeInterviewId");
    localStorage.removeItem("resumeAnalysis");

    setToken(null);
    setUser(null);
    setAnalysis(null);
  };

  // Show login page if user is not authenticated
  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">

        {/* User Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "15px",
            padding: "10px 0",
          }}
        >
          <span>
            Welcome, {user?.name || "User"}
          </span>

          <button
            onClick={handleLogout}
            style={{
              padding: "9px 18px",
              border: "none",
              borderRadius: "7px",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        <Topbar />

        <StatCards />

        {/* Resume Upload and Performance */}
        <div className="dashboard-middle">
          <ResumeUpload
            onAnalysisSuccess={handleAnalysisSuccess}
          />

          <PerformanceOverview />
        </div>

        {/* Resume Analysis and Question Generator */}
        {analysis && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "25px 0",
              }}
            >
              <button
                onClick={handleRemoveResume}
                style={{
                  padding: "12px 30px",
                  border: "none",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 18px rgba(99, 102, 241, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(99, 102, 241, 0.3)";
                }}
              >
                Change Resume
              </button>
            </div>

            <ResumeAnalysis analysis={analysis} />

            <QuestionGenerator
              resumeAnalysis={analysis}
            />
          </>
        )}

        {/* Dashboard Bottom Section */}
        <div className="dashboard-bottom">
          <InterviewBanner />
          <RecentActivity />
        </div>

      </main>
    </div>
  );
}

export default App;
