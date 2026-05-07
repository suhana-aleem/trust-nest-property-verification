const multer = require("multer");
const path = require("path");

const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF, JPG, PNG files are allowed"), false);
  }
  cb(null, true);
};

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const getFileExtension = (fileName) => path.extname(fileName || "").toLowerCase();

module.exports = { uploadDocument, getFileExtension };
