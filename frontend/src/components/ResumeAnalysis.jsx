
import { useState } from "react";

import {
  FileText,
  Award,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  User,
  Mail,
  Phone,
  GraduationCap,
  ChevronDown,
  ChevronUp
} from "lucide-react";

function ResumeAnalysis({ analysis }) {
  const [showFullReport, setShowFullReport] = useState(false);

  if (!analysis) return null;

  const skills = analysis.technical_skills || [];
  const strengths = analysis.strengths || [];
  const weaknesses = analysis.missing_skills || [];
  const suggestions = analysis.resume_improvement_suggestions || [];
  const roles = analysis.suggested_job_roles || [];
  const education = analysis.education || [];
  const projects = analysis.projects || [];
  const experience = analysis.work_experience || [];

  const renderList = (items) => {
    if (typeof items === "string") return [items];
    return Array.isArray(items) ? items : [];
  };

  const score = Number(analysis.score);

  return (
    <section className="resume-report-compact">

      {/* Compact report header */}
      <div className="resume-report-top">
        <div className="resume-report-title">
          <span className="resume-report-icon">
            <FileText size={23} />
          </span>

          <div>
            <h2>Resume Analysis Report</h2>
            <p>Your AI-generated resume insights</p>
          </div>
        </div>

        <span className="resume-report-status">
          <CheckCircle size={15} />
          Analyzed
        </span>
      </div>

      {/* Compact summary */}
      <div className="resume-report-summary">

        <div className="resume-report-score">
          <div>
            <span>Overall Resume Score</span>

            <h1>
              {Number.isFinite(score) ? `${score}/100` : "N/A"}
            </h1>

            <p>AI Resume Score</p>
          </div>

          <div className="resume-report-award">
            <Award size={34} />
          </div>
        </div>

        <div className="resume-report-details">
          <h3>
            <User size={17} />
            {analysis.candidate_name || "Candidate"}
          </h3>

          <p>
            <Mail size={15} />
            {analysis.email || "Email not found"}
          </p>

          <p>
            <Phone size={15} />
            {analysis.phone || "Phone not found"}
          </p>
        </div>

      </div>

      {/* Short professional summary */}
      <div className="resume-report-professional">
        <h3>Professional Summary</h3>

        <p>
          {analysis.professional_summary || "Not available"}
        </p>
      </div>

      {/* Compact skills preview */}
      <div className="resume-report-preview">
        <div>
          <h3>Skills Detected</h3>

          <div className="skills-list">
            {renderList(skills).slice(0, 8).map((skill, index) => (
              <span className="skill-tag" key={index}>
                {skill}
              </span>
            ))}
          </div>

          {renderList(skills).length > 8 && (
            <p className="resume-report-extra">
              +{renderList(skills).length - 8} more skills
            </p>
          )}
        </div>

        <div>
          <h3>Key Strengths</h3>

          {renderList(strengths).slice(0, 2).map((item, index) => (
            <p className="resume-report-strength" key={index}>
              <CheckCircle size={15} color="#34D399" />
              {item}
            </p>
          ))}
        </div>
      </div>

      {/* Expand / collapse button */}
      <button
        type="button"
        className="resume-report-toggle"
        onClick={() => setShowFullReport((previous) => !previous)}
      >
        {showFullReport ? (
          <>
            Hide Full Analysis
            <ChevronUp size={19} />
          </>
        ) : (
          <>
            View Full Analysis
            <ChevronDown size={19} />
          </>
        )}
      </button>

      {/* Full report */}
      {showFullReport && (
        <div className="resume-report-full">

          <div className="analysis-section">
            <h3>
              <User size={19} />
              Candidate Information
            </h3>

            <p>Name: {analysis.candidate_name || "Not found"}</p>
            <p>Email: {analysis.email || "Not found"}</p>
            <p>Phone: {analysis.phone || "Not found"}</p>
          </div>

          <div className="analysis-section">
            <h3>Professional Summary</h3>
            <p>{analysis.professional_summary || "Not available"}</p>
          </div>

          <div className="analysis-section">
            <h3>All Skills Detected</h3>

            <div className="skills-list">
              {renderList(skills).map((skill, index) => (
                <span className="skill-tag" key={index}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="analysis-grid">

            <div className="analysis-section">
              <h3>
                <CheckCircle color="#34D399" />
                Strengths
              </h3>

              {renderList(strengths).map((item, index) => (
                <p className="analysis-item" key={index}>
                  <CheckCircle size={16} color="#34D399" />
                  {item}
                </p>
              ))}
            </div>

            <div className="analysis-section">
              <h3>
                <AlertCircle color="#FBBF24" />
                Missing Skills
              </h3>

              {renderList(weaknesses).map((item, index) => (
                <p className="analysis-item" key={index}>
                  <AlertCircle size={16} color="#FBBF24" />
                  {item}
                </p>
              ))}
            </div>

          </div>

          <div className="analysis-section">
            <h3>
              <GraduationCap />
              Education
            </h3>

            {renderList(education).map((item, index) => (
              <p key={index}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </p>
            ))}
          </div>

          <div className="analysis-section">
            <h3>Work Experience</h3>

            {renderList(experience).map((item, index) => (
              <p key={index}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </p>
            ))}
          </div>

          <div className="analysis-section">
            <h3>
              <Briefcase />
              Projects
            </h3>

            {renderList(projects).map((item, index) => (
              <p key={index}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </p>
            ))}
          </div>

          <div className="analysis-section">
            <h3>
              <Lightbulb color="#38BDF8" />
              Improvement Suggestions
            </h3>

            {renderList(suggestions).map((item, index) => (
              <p className="analysis-item" key={index}>
                <Lightbulb size={16} color="#38BDF8" />
                {item}
              </p>
            ))}
          </div>

          <div className="analysis-section">
            <h3>
              <Briefcase color="#60A5FA" />
              Recommended Job Roles
            </h3>

            <div className="skills-list">
              {renderList(roles).map((role, index) => (
                <span className="skill-tag" key={index}>
                  {role}
                </span>
              ))}
            </div>
          </div>

        </div>
      )}

    </section>
  );
}

export default ResumeAnalysis;
