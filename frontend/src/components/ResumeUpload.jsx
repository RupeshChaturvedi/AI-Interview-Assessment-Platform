
import { useRef, useState } from "react";
import axios from "axios";
import { UploadCloud, FileText, Upload } from "lucide-react";

function ResumeUpload({ onAnalysisSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please select a PDF or DOCX file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5 MB.");
      return;
    }

    setFile(selectedFile);
    setError("");
    onAnalysisSuccess(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError("");
      onAnalysisSuccess(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:5000/api/resume/analyze",
        formData
      );

      if (response.data.success && response.data.analysis) {
        onAnalysisSuccess(response.data.analysis);
      } else {
        setError("Analysis response was not valid.");
      }

    } catch (err) {
      console.error("Resume upload error:", err);

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Resume analysis failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resume-card">

      <div className="resume-heading">
        <UploadCloud size={48} color="#38BDF8" />

        <div>
          <h2>Upload Your Resume</h2>
          <p>Get personalized questions based on your resume</p>
        </div>
      </div>

      <div
        className={`upload-area ${dragging ? "drag-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >

        <FileText size={65} color="#60A5FA" />

        <h3>
          {file ? file.name : "Drag & drop your resume here"}
        </h3>

        <p>or</p>

        <button
          className="browse-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={17} />
          Browse Files
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          hidden
          onChange={(e) => {
            handleFile(e.target.files[0]);
            e.target.value = "";
          }}
        />

        <span>Supports: PDF, DOCX (Max 5 MB)</span>
      </div>

      {file && (
        <p className="selected-file">
          Selected: {file.name}
        </p>
      )}

      {file && (
        <div className="analyze-button-wrapper">
        <button
          className="browse-btn"
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "Analyzing Resume..." : "Analyze Resume"}
        </button>
        </div>
      )}

      {error && (
        <p style={{ color: "#F87171", marginTop: "12px" }}>
          {error}
        </p>
      )}

    </div>
  );
}

export default ResumeUpload;
