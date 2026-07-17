const express = require("express");
const {
  uploadDocument,
  getDocuments,
  getOriginalDocuments,
  getDocumentById,
  streamDocumentFile,
  getDocumentVersions,
  addParticipant,
  createSuggestion,
  getSuggestions,
  reviewSuggestion,
  commentOnSuggestion,
  approveAsSeller,
  approveAsBuyer,
  approveAsLegal,
  approveAsRegistrar,
  adminDecision,
  analyzeDocument,
  registerOnBlockchain,
  verifyDocumentHash,
  lockDocument,
  issueCertificate,
  getCertificate,
  deleteDocument
} = require("../controllers/documentController");
const { protect } = require("../middlewares/auth");
const { authorize } = require("../middlewares/rbac");
const { validateRequest } = require("../middlewares/validate");
const { uploadDocument: upload } = require("../middlewares/upload");
const {
  createDocumentValidation,
  addParticipantValidation,
  suggestionValidation,
  reviewSuggestionValidation,
  suggestionCommentValidation
} = require("../validators/documentValidator");
const { USER_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

router.get("/", getDocuments);
router.get("/originals", getOriginalDocuments);
router.get("/:id/file", streamDocumentFile);
router.get("/:id", getDocumentById);
router.get("/:id/versions", getDocumentVersions);
router.post("/:id/participants", addParticipantValidation, validateRequest, addParticipant);
router.get("/:id/suggestions", getSuggestions);
router.post(
  "/:id/suggestions",
  authorize(USER_ROLES.SELLER, USER_ROLES.BUYER),
  suggestionValidation,
  validateRequest,
  createSuggestion
);
router.post(
  "/:id/suggestions/:suggestionId/review",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  reviewSuggestionValidation,
  validateRequest,
  reviewSuggestion
);
router.post(
  "/:id/suggestions/:suggestionId/comment",
  authorize(USER_ROLES.SELLER, USER_ROLES.BUYER, USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  suggestionCommentValidation,
  validateRequest,
  commentOnSuggestion
);
router.post("/:id/approve/seller", authorize(USER_ROLES.SELLER), approveAsSeller);
router.post("/:id/approve/buyer", authorize(USER_ROLES.BUYER), approveAsBuyer);
router.post(
  "/:id/approve/legal",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  approveAsLegal
);
router.post(
  "/:id/admin-decision",
  authorize(USER_ROLES.ADMIN),
  adminDecision
);
router.post(
  "/:id/approve/registrar",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  approveAsRegistrar
);

router.post(
  "/upload",
  authorize(USER_ROLES.SELLER, USER_ROLES.BUYER, USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  upload.single("document"),
  createDocumentValidation,
  validateRequest,
  uploadDocument
);

router.post(
  "/:id/analyze-ai",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN, USER_ROLES.SELLER, USER_ROLES.BUYER),
  analyzeDocument
);

router.post(
  "/:id/register-blockchain",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  registerOnBlockchain
);

router.get("/:id/verify-blockchain", verifyDocumentHash);

router.post(
  "/:id/lock",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  lockDocument
);
router.post(
  "/:id/issue-certificate",
  authorize(USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  issueCertificate
);
router.get("/:id/certificate", getCertificate);
router.delete(
  "/:id",
  authorize(USER_ROLES.SELLER, USER_ROLES.BUYER, USER_ROLES.REGISTRAR, USER_ROLES.ADMIN),
  deleteDocument
);

module.exports = router;
