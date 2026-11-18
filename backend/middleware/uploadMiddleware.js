
const multer = require("multer");
const path = require("path");

// Allowed file extensions
const allowedExtensions = [".pdf", ".doc", ".docx"];

// Allowed MIME types
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// Store uploaded file in memory
const storage = multer.memoryStorage();

// File validation
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  const validExtension = allowedExtensions.includes(extension);
  const validMimeType = allowedMimeTypes.includes(file.mimetype);

  if (validExtension && validMimeType) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF, DOC and DOCX files are allowed!"),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Export middleware
module.exports = upload;
