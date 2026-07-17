const express = require("express");
const { body } = require("express-validator");
const { protect } = require("../middlewares/auth");
const { validateRequest } = require("../middlewares/validate");
const {
  verifyDocument,
  getVerificationReport,
  getLatestVerificationReportForDocument
} = require("../controllers/verificationController");

const router = express.Router();

router.use(protect);

router.post(
  "/verify-document",
  body("documentId").isMongoId().withMessage("documentId must be a valid document id"),
  validateRequest,
  verifyDocument
);
router.get("/verification-report/:id", getVerificationReport);
router.get("/verification-report/document/:id/latest", getLatestVerificationReportForDocument);

module.exports = router;
