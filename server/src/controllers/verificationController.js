const Document = require("../models/Document");
const VerificationReport = require("../models/VerificationReport");
const asyncHandler = require("../utils/asyncHandler");
const { createAuditLog } = require("../services/auditService");
const { verifyDocumentWithAI } = require("../services/verificationService");
const { sha256FromBuffer } = require("../utils/hash");
const { readStoredFile } = require("../services/storage/storageService");
const { USER_ROLES } = require("../utils/constants");

const hasBackofficeAccess = (role) =>
  [USER_ROLES.ADMIN, USER_ROLES.REGISTRAR].includes(role);

const canAccessDocument = (document, userId) => {
  if (document.uploadedBy.toString() === userId.toString()) return true;
  return document.participants.some((participant) => participant.toString() === userId.toString());
};

const verifyDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.body;
  const document = await Document.findById(documentId);

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { report } = await verifyDocumentWithAI({
    document,
    actor: req.user
  });

  await createAuditLog({
    actor: req.user._id,
    action: "VERIFICATION_REPORT_CREATED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { verificationReportId: report._id, status: report.status },
    ipAddress: req.ip
  });

  res.status(201).json({
    message: "Document authenticity verification completed",
    verificationReport: report
  });
});

const getVerificationReport = asyncHandler(async (req, res) => {
  const report = await VerificationReport.findById(req.params.id)
    .populate("documentId", "title propertyId status documentType sourceDocument latestVerificationReport uploadedBy participants")
    .populate("verifiedBy", "name role email");

  if (!report) {
    return res.status(404).json({ message: "Verification report not found" });
  }
  if (!canAccessDocument(report.documentId, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json({ verificationReport: report });
});

const getLatestVerificationReportForDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const report = await VerificationReport.findOne({ documentId: document._id })
    .populate("verifiedBy", "name role email")
    .sort({ createdAt: -1 });

  if (!report) {
    return res.status(404).json({ message: "No verification report found for this document" });
  }

  const blockchainHash = sha256FromBuffer(await readStoredFile(document));
  if (!report.blockchainHash) {
    report.blockchainHash = blockchainHash;
    await report.save();
  }

  res.json({ verificationReport: report });
});

module.exports = {
  verifyDocument,
  getVerificationReport,
  getLatestVerificationReportForDocument
};
