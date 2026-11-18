
import { useEffect, useState } from "react";
import axios from "axios";

import {
  BriefcaseBusiness,
  Star,
  Clock,
  Target
} from "lucide-react";

const API_URL = "http://localhost:5000/api/interviews";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

function StatCards() {
  const [stats, setStats] = useState({
    interviewsCompleted: 0,
    averageScore: 0,
    practiceTime: "0h 0m",
    improvement: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const fetchDashboardStats = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/stats/dashboard`,
          getAuthConfig()
        );

        if (!response.data?.success) {
          throw new Error("Unable to load dashboard statistics.");
        }

        if (isMounted) {
          setStats({
            interviewsCompleted:
              response.data.stats?.interviewsCompleted ?? 0,

            averageScore:
              response.data.stats?.averageScore ?? 0,

            practiceTime:
              response.data.stats?.practiceTime ?? "0h 0m",

            improvement:
              response.data.stats?.improvement ?? null
          });

          setError("");
        }

      } catch (err) {
        console.error("Dashboard Stats Error:", err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
            "Unable to load dashboard statistics."
          );
        }

      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardStats();

    // Refresh dashboard statistics every 10 seconds
    intervalId = window.setInterval(
      fetchDashboardStats,
      10000
    );

    // Refresh when user returns to the browser tab
    const handleFocus = () => {
      fetchDashboardStats();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;

      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  const statsCards = [
    {
      title: "Interviews Completed",
      value: stats.interviewsCompleted,
      change: "",
      icon: BriefcaseBusiness,
      color: "stat-teal"
    },
    {
      title: "Average Score",
      value: `${stats.averageScore}%`,
      change: "",
      icon: Star,
      color: "stat-purple"
    },
    {
      title: "Total Practice Time",
      value: stats.practiceTime,
      change: "",
      icon: Clock,
      color: "stat-blue"
    },
    {
      title: "Improvement",
      value:
        stats.improvement === null
          ? "--"
          : `${stats.improvement > 0 ? "+" : ""}${stats.improvement}%`,

      change: "",
      icon: Target,
      color: "stat-green"
    }
  ];

  if (loading) {
    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <p>Loading dashboard statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="question-error">
          {error}
        </p>
      )}

      <div className="stats-grid">
        {statsCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className={`stat-card ${item.color}`}
              key={item.title}
            >
              <div className="stat-icon">
                <Icon size={29} />
              </div>

              <div className="stat-info">
                <p>{item.title}</p>

                <div className="stat-value">
                  <h2>{item.value}</h2>
                  <span>{item.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default StatCards;
