
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");


// Load environment variables first
dotenv.config();

// Import routes and database

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const interviewProgressRoutes = require("./routes/interviewProgressRoutes");
const connectDB = require("./config/db");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/interviews", interviewProgressRoutes);

// MongoDB connection
connectDB();

// Home API
app.get("/", (req, res) => {
  res.send("AI Interview Platform Backend is Running!");
});

// Test API
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Our first API is working!",
    project: "AI Interview Platform"
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
