
import { useEffect, useState } from "react";
import axios from "axios";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

import { ChartNoAxesColumnIncreasing } from "lucide-react";

const INTERVIEW_API_URL = "http://localhost:5000/api/interviews";

const ROUND_CONFIG = {
  aptitude_questions: {
    name: "Aptitude",
    color: "#3B9EFF"
  },
  technical_questions: {
    name: "Technical",
    color: "#A855F7"
  },
  coding_questions: {
    name: "Coding",
    color: "#2DD4BF"
  },
  hr_questions: {
    name: "HR",
    color: "#FB923C"
  }
};

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  }
});

const getPercentage = (result) => {
  if (!result) return null;

  if (result.percentage !== undefined) {
    return Number(result.percentage);
  }

  if (
    result.total_score !== undefined &&
    Number(result.max_score) > 0
  ) {
    return Math.round(
      (Number(result.total_score) / Number(result.max_score)) * 100
    );
  }

  if (result.score !== undefined) {
    return Number(result.score);
  }

  return null;
};

function PerformanceOverview() {
  const [roundScores, setRoundScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const fetchPerformance = async () => {
      try {
        const interviewId = localStorage.getItem("activeInterviewId");

        if (!interviewId) {
          if (isMounted) {
            setRoundScores([]);
            setLoading(false);
          }
          return;
        }

        const response = await axios.get(
          `${INTERVIEW_API_URL}/${interviewId}/progress`,
          getAuthConfig()
        );

        if (!response.data?.success) {
          throw new Error("Performance data could not be loaded.");
        }

        const progress = response.data.progress || {};

        const rawResults = progress.evaluationResults || {};

        const evaluationResults =
          rawResults instanceof Map
            ? Object.fromEntries(rawResults)
            : rawResults;

        console.log("Dashboard evaluation results:", evaluationResults);

        const scores = Object.entries(ROUND_CONFIG)
          .map(([roundType, config]) => {
            const result = evaluationResults[roundType];

            if (!result) return null;

            const percentage = getPercentage(result);

            if (
              percentage === null ||
              !Number.isFinite(percentage)
            ) {
              return null;
            }

            return {
              name: config.name,
              value: Math.max(0, Math.min(100, percentage)),
              color: config.color
            };
          })
          .filter(Boolean);

        if (isMounted) {
          setRoundScores(scores);
          setError("");
        }
      } catch (err) {
        console.error("Performance Fetch Error:", err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Unable to load performance data."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPerformance();

    // Refresh scores automatically after returning from an interview.
    intervalId = window.setInterval(fetchPerformance, 5000);

    // Refresh when the browser tab becomes active.
    const handleFocus = () => {
      fetchPerformance();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const completedCount = roundScores.length;

  const overallScore =
    completedCount > 0
      ? Math.round(
          roundScores.reduce((total, item) => total + item.value, 0) /
          completedCount
        )
      : 0;

  const chartData = roundScores.map((item) => ({
    name: item.name,
    score: item.value
  }));

  if (loading) {
    return (
      <div className="performance-card">
        <p>Loading performance overview...</p>
      </div>
    );
  }

  return (
    <div className="performance-card">

      <div className="performance-heading">

        <ChartNoAxesColumnIncreasing
          size={32}
          color="#438CFF"
        />

        <h2>Your Performance Overview</h2>

        <span>
          {completedCount}/4 Rounds Completed
        </span>

      </div>

      {error && (
        <div className="question-error">
          {error}
        </div>
      )}

      {completedCount === 0 ? (
        <div className="performance-empty">
          <h3>No Performance Data Yet</h3>
          <p>
            Complete an interview round to see your actual
            AI evaluation scores here.
          </p>
        </div>
      ) : (
        <>
          <div className="performance-content">

            <div className="donut-container">

              <ResponsiveContainer width="100%" height={190}>
                <PieChart>

                  <Pie
                    data={roundScores}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {roundScores.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => [`${value}%`, "Score"]}
                  />

                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <h2>{overallScore}%</h2>
                <span>Overall Score</span>
              </div>

            </div>

            <div className="skill-legend">

              {roundScores.map((item) => (
                <div className="skill-item" key={item.name}>

                  <span
                    className="skill-dot"
                    style={{ background: item.color }}
                  />

                  <span className="skill-name">
                    {item.name}
                  </span>

                  <strong>{item.value}%</strong>

                </div>
              ))}

            </div>

          </div>

          <div className="line-chart">

            <h3>Round-wise Performance</h3>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>

                <CartesianGrid
                  stroke="#29416A"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fill: "#B9C9E5", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: "#B9C9E5", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />

                <Tooltip
                  contentStyle={{
                    background: "#102957",
                    border: "1px solid #36558B",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                  formatter={(value) => [`${value}%`, "Score"]}
                />

                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#29B6F6"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                  dot={{
                    fill: "#FFFFFF",
                    stroke: "#29B6F6",
                    strokeWidth: 3,
                    r: 5
                  }}
                />

              </LineChart>
            </ResponsiveContainer>

          </div>
        </>
      )}

    </div>
  );
}

export default PerformanceOverview;
