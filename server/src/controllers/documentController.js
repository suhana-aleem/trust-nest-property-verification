const Document = require("../models/Document");
const DocumentVersion = require("../models/DocumentVersion");
const BlockchainRecord = require("../models/BlockchainRecord");
const User = require("../models/User");
const Suggestion = require("../models/Suggestion");
const VerificationCertificate = require("../models/VerificationCertificate");
const VerificationReport = require("../models/VerificationReport");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const asyncHandler = require("../utils/asyncHandler");
const { DOCUMENT_STATUS, USER_ROLES, DOCUMENT_TYPES } = require("../utils/constants");
const { createAuditLog } = require("../services/auditService");
const { verifyDocumentWithAI } = require("../services/verificationService");
const { sha256FromBuffer } = require("../utils/hash");
const { storeHashOnChain, verifyHashOnChain } = require("../services/blockchainService");
const {
  storeUploadedFile,
  readStoredFile,
  removeStoredFile
} = require("../services/storage/storageService");

const canAccessDocument = (doc, userId) => {
  if (doc.uploadedBy.toString() === userId.toString()) return true;
  return doc.participants.some((participant) => participant.toString() === userId.toString());
};

const canModerateOrFinalize = (role) =>
  [USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(role);

const hasBackofficeAccess = (role) =>
  [USER_ROLES.ADMIN, USER_ROLES.REGISTRAR].includes(role);

const canDeleteDocument = (doc, user) =>
  hasBackofficeAccess(user.role) || doc.uploadedBy.toString() === user._id.toString();

const isDemoOrTestDocument = (document) =>
  [document.title, document.propertyTitle, document.propertyId, document.fileName].some((value) =>
    /\b(demo|test|sample)\b/i.test(String(value || ""))
  );

const buildPreviewMetadata = (document) => ({
  previewMimeType: document.mimeType,
  canPreviewInline: /^image\/|application\/pdf$/.test(document.mimeType),
  previewEndpoint: `/api/documents/${document._id}/file`
});

const formatCertificateDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

const getCertificateVerdict = ({ document, verificationReport }) => {
  const reportStatus = verificationReport?.status || "";
  const aiVerdict = document?.aiAnalysis?.genuineVerdict || "";

  if (reportStatus === "VERIFIED GENUINE" || aiVerdict === "VERIFIED GENUINE") {
    return {
      label: "GENUINE",
      status: "VERIFIED GENUINE",
      color: "#166534"
    };
  }

  if (reportStatus === "HIGH RISK / FAKE" || aiVerdict === "HIGH RISK / FAKE") {
    return {
      label: "FAKE",
      status: "HIGH RISK / FAKE",
      color: "#991b1b"
    };
  }

  return {
    label: reportStatus || aiVerdict || "PENDING",
    status: reportStatus || aiVerdict || "PENDING",
    color: "#92400e"
  };
};

const generateCertificatePdfBuffer = ({
  document,
  certificate,
  verificationReport,
  issuedByName
}) =>
  new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true
    });
    const chunks = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    pdf.pipe(stream);

    const verdict = getCertificateVerdict({ document, verificationReport });
    const reportStatus = verificationReport?.status || "Not available";
    const confidence = verificationReport?.confidenceScore != null
      ? `${verificationReport.confidenceScore}%`
      : "N/A";
    const forgeryProbability = verificationReport?.forgeryProbability != null
      ? `${Math.round(verificationReport.forgeryProbability * 100)}%`
      : "N/A";
    const summary =
      verificationReport?.verificationSummary ||
      document?.referenceCheck?.summary ||
      "No detailed verification summary is available for this certificate.";
    const hashValue = verificationReport?.blockchainHash || "Not available";
    const issueDate = formatCertificateDate(certificate.issuedAt || new Date());

    pdf
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(26)
      .text("TRUST NEST", { align: "center" });
    pdf
      .font("Helvetica")
      .fontSize(14)
      .fillColor("#475569")
      .text("Property Document Verification Certificate", { align: "center" });

    pdf.moveDown(0.8);
    pdf
      .roundedRect(48, 110, 499, 68, 12)
      .fillAndStroke("#f8fafc", "#cbd5e1");
    pdf
      .fillColor(verdict.color)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(`VERDICT: ${verdict.status}`, 64, 132, { width: 465, align: "center" });

    pdf.moveDown(1.5);
    pdf
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("Certificate Details");

    const details = [
      ["Certificate Number", certificate.certificateNumber],
      ["Document Title", document.title],
      ["Property Title", document.propertyTitle],
      ["Property ID", document.propertyId],
      ["File Name", document.fileName],
      ["Document Type", document.documentType === "Original" ? "Registrar Original" : "Submitted Copy"],
      ["Issued By", issuedByName || "Unknown"],
      ["Issued On", issueDate],
      ["AI / Report Status", reportStatus],
      ["Confidence Score", confidence],
      ["Forgery Probability", forgeryProbability],
      ["Blockchain Hash", hashValue]
    ];

    pdf.font("Helvetica").fontSize(11).fillColor("#111827");
    details.forEach(([label, value]) => {
      pdf.moveDown(0.4);
      pdf.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      pdf.font("Helvetica").text(String(value || "N/A"));
    });

    pdf.moveDown(0.8);
    pdf
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Verification Summary");
    pdf
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#111827")
      .text(summary, {
        align: "left",
        lineGap: 4
      });

    pdf.moveDown(1);
    pdf
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Certification Statement");
    pdf
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#111827")
      .text(
        `This certificate records that the uploaded copy was evaluated by TRUST NEST and classified as ${verdict.status}. ` +
          "It is generated for academic verification, audit tracking, and review purposes."
      );

    pdf.moveDown(1.2);
    pdf
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Authorized Signature");
    pdf
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#111827")
      .text("Registrar / Admin review completed and certificate issued within TRUST NEST workflow.");

    pdf.end();
  });

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Document file is required" });
  }

  const { title, propertyTitle, propertyId, sourceDocumentId } = req.body;
  const isBackofficeUploader = [USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role);
  const requestedType = req.body.documentType;
  const documentType = isBackofficeUploader
    ? requestedType || DOCUMENT_TYPES.ORIGINAL
    : DOCUMENT_TYPES.SUBMITTED_COPY;
  let sourceDocument = null;

  if (![DOCUMENT_TYPES.ORIGINAL, DOCUMENT_TYPES.SUBMITTED_COPY].includes(documentType)) {
    return res.status(400).json({ message: "documentType must be Original or SubmittedCopy" });
  }

  if (!isBackofficeUploader && requestedType && requestedType !== DOCUMENT_TYPES.SUBMITTED_COPY) {
    return res.status(403).json({ message: "Buyers and sellers can only upload documents for verification" });
  }

  if (documentType === DOCUMENT_TYPES.ORIGINAL && !isBackofficeUploader) {
    return res.status(403).json({ message: "Only Registrar or Admin can upload original documents" });
  }

  if (documentType === DOCUMENT_TYPES.SUBMITTED_COPY && ![USER_ROLES.SELLER, USER_ROLES.BUYER].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Buyer or Seller can upload documents for verification" });
  }

  if (documentType === DOCUMENT_TYPES.SUBMITTED_COPY) {
    if (!sourceDocumentId) {
      return res.status(400).json({ message: "sourceDocumentId is required when uploading a document copy" });
    }

    sourceDocument = await Document.findById(sourceDocumentId);
    if (
      !sourceDocument
      || sourceDocument.documentType !== DOCUMENT_TYPES.ORIGINAL
      || sourceDocument.status !== DOCUMENT_STATUS.LOCKED
    ) {
      return res.status(400).json({ message: "A locked registrar original is required for copy verification" });
    }
  }

  const finalPropertyId = String(propertyId || "").trim();
  const storage = await storeUploadedFile(req.file);

  const document = await Document.create({
    title,
    propertyTitle,
    propertyId: finalPropertyId,
    documentType,
    sourceDocument: sourceDocument?._id || null,
    uploadedBy: req.user._id,
    participants: [req.user._id],
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    storage,
    status: DOCUMENT_STATUS.UPLOADED
  });

  await DocumentVersion.create({
    document: document._id,
    versionNumber: 1,
    content: "",
    editedBy: req.user._id,
    operation: { type: "set" }
  });

  await createAuditLog({
    actor: req.user._id,
    action: "DOCUMENT_UPLOADED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: {
      fileName: document.fileName,
      status: document.status,
      documentType,
      sourceDocumentId: sourceDocument?._id || null
    },
    ipAddress: req.ip
  });

  return res.status(201).json({ document });
});

const getDocuments = asyncHandler(async (req, res) => {
  const filter = hasBackofficeAccess(req.user.role)
    ? {}
    : { $or: [{ uploadedBy: req.user._id }, { participants: req.user._id }] };

  const documents = await Document.find(filter)
    .populate("uploadedBy", "name email role")
    .populate("sourceDocument", "title propertyId documentType")
    .populate("latestVerificationReport", "status confidenceScore")
    .sort({ createdAt: -1 });

  return res.json({
    documents: documents.map((document) => ({
      ...document.toObject(),
      ...buildPreviewMetadata(document)
    }))
  });
});

const getOriginalDocuments = asyncHandler(async (req, res) => {
  const originals = await Document.find({
    documentType: DOCUMENT_TYPES.ORIGINAL,
    status: DOCUMENT_STATUS.LOCKED
  })
    .populate("uploadedBy", "name email role")
    .sort({ createdAt: -1 });

  return res.json({
    originals: originals.map((document) => ({
      ...document.toObject(),
      ...buildPreviewMetadata(document)
    }))
  });
});

const getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate("uploadedBy", "name role")
    .populate("sourceDocument", "title propertyId documentType uploadedBy");
  if (document) {
    await document.populate("latestVerificationReport");
  }
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  return res.json({
    document: {
      ...document.toObject(),
      ...buildPreviewMetadata(document)
    }
  });
});

const streamDocumentFile = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const fileBuffer = await readStoredFile(document);
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Length", fileBuffer.length);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(document.fileName)}"`);
  res.send(fileBuffer);
});

const getDocumentVersions = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const versions = await DocumentVersion.find({ document: document._id })
    .populate("editedBy", "name role")
    .sort({ versionNumber: -1 });

  res.json({ versions });
});

const addParticipant = asyncHandler(async (req, res) => {
  const { userEmail } = req.body;
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });

  if (document.uploadedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only uploader can add collaborators" });
  }

  const participant = await User.findOne({ email: userEmail });
  if (!participant) {
    return res.status(404).json({ message: "Collaborator user not found" });
  }

  const alreadyAdded = document.participants.some(
    (item) => item.toString() === participant._id.toString()
  );
  if (!alreadyAdded) {
    document.participants.push(participant._id);
    await document.save();
  }

  await createAuditLog({
    actor: req.user._id,
    action: "COLLABORATOR_ADDED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { collaboratorId: participant._id, collaboratorEmail: participant.email },
    ipAddress: req.ip
  });

  res.json({ message: "Collaborator added", participant: { id: participant._id, email: participant.email } });
});

const analyzeDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  const { aiResult, referenceCheck, report } = await verifyDocumentWithAI({
    document,
    actor: req.user
  });

  await createAuditLog({
    actor: req.user._id,
    action: "DOCUMENT_AI_VERIFIED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: {
      signatureScore: aiResult.signature_score,
      forgeryProbability: aiResult.forgery_probability
    },
    ipAddress: req.ip
  });

  res.json({
    message: "AI analysis completed",
    result: document.aiAnalysis,
    referenceCheck,
    verificationReportId: report._id
  });
});

const registerOnBlockchain = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar can register blockchain record" });
  }

  if (document.status === DOCUMENT_STATUS.LOCKED) {
    return res.status(400).json({ message: "Document is already locked" });
  }

  if (![DOCUMENT_STATUS.AI_VERIFIED, DOCUMENT_STATUS.ADMIN_APPROVED].includes(document.status)) {
    return res.status(400).json({ message: "Document must be AI Verified and admin-approved before blockchain registration" });
  }
  if (!document.approvals?.adminApproved || document.adminDecision?.verdict !== "Approved") {
    return res.status(400).json({ message: "Admin final approval is required before blockchain registration" });
  }

  const hashHex = sha256FromBuffer(await readStoredFile(document));
  const alreadyOnChain = await verifyHashOnChain(hashHex);
  if (alreadyOnChain) {
    return res.status(409).json({
      message: "This document hash is already registered on blockchain",
      hash: hashHex
    });
  }

  const receipt = await storeHashOnChain(hashHex);

  const blockchainRecord = await BlockchainRecord.create({
    document: document._id,
    documentHash: hashHex,
    transactionHash: receipt.transactionHash,
    blockNumber: Number(receipt.blockNumber),
    registeredBy: req.user._id
  });

  document.status = DOCUMENT_STATUS.BLOCKCHAIN_REGISTERED;
  await document.save();

  await createAuditLog({
    actor: req.user._id,
    action: "DOCUMENT_BLOCKCHAIN_REGISTERED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { hashHex, transactionHash: receipt.transactionHash },
    ipAddress: req.ip
  });

  res.json({ message: "Document registered on blockchain", blockchainRecord });
});

const verifyDocumentHash = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });

  const hashHex = sha256FromBuffer(await readStoredFile(document));
  const existsOnChain = await verifyHashOnChain(hashHex);
  res.json({ hash: hashHex, existsOnChain });
});

const lockDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar can lock a document" });
  }
  if (document.status !== DOCUMENT_STATUS.BLOCKCHAIN_REGISTERED) {
    return res.status(400).json({ message: "Document must be blockchain registered before lock" });
  }

  document.status = DOCUMENT_STATUS.LOCKED;
  document.isLocked = true;
  await document.save();

  await createAuditLog({
    actor: req.user._id,
    action: "DOCUMENT_LOCKED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { status: document.status },
    ipAddress: req.ip
  });

  res.json({ message: "Document locked successfully", document });
});

const createSuggestion = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (document.isLocked) {
    return res.status(400).json({ message: "Document is locked. Suggestions are disabled." });
  }
  if (![USER_ROLES.SELLER, USER_ROLES.BUYER].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Seller or Buyer can create suggestions" });
  }
  if (!canAccessDocument(document, req.user._id) && !canModerateOrFinalize(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const suggestion = await Suggestion.create({
    document: document._id,
    suggestedBy: req.user._id,
    suggestionText: req.body.suggestionText,
    context: req.body.context || ""
  });

  await createAuditLog({
    actor: req.user._id,
    action: "SUGGESTION_CREATED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { suggestionId: suggestion._id },
    ipAddress: req.ip
  });

  res.status(201).json({ suggestion });
});

const getSuggestions = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !canModerateOrFinalize(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const suggestions = await Suggestion.find({ document: document._id })
    .populate("suggestedBy", "name role email")
    .populate("reviewedBy", "name role")
    .populate("comments.author", "name role")
    .sort({ createdAt: -1 });

  res.json({ suggestions });
});

const reviewSuggestion = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar or Admin can accept/reject suggestions" });
  }

  const suggestion = await Suggestion.findOne({
    _id: req.params.suggestionId,
    document: document._id
  });
  if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

  suggestion.status = req.body.status;
  suggestion.reviewedBy = req.user._id;
  suggestion.reviewNote = req.body.reviewNote || "";
  await suggestion.save();

  await createAuditLog({
    actor: req.user._id,
    action: "SUGGESTION_REVIEWED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { suggestionId: suggestion._id, status: suggestion.status },
    ipAddress: req.ip
  });

  res.json({ message: "Suggestion reviewed", suggestion });
});

const commentOnSuggestion = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (
    ![USER_ROLES.SELLER, USER_ROLES.BUYER, USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(
      req.user.role
    )
  ) {
    return res.status(403).json({ message: "Role not allowed to comment" });
  }

  const suggestion = await Suggestion.findOne({
    _id: req.params.suggestionId,
    document: document._id
  });
  if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

  suggestion.comments.push({
    author: req.user._id,
    text: req.body.text
  });
  await suggestion.save();

  await createAuditLog({
    actor: req.user._id,
    action: "SUGGESTION_COMMENTED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { suggestionId: suggestion._id },
    ipAddress: req.ip
  });

  res.json({ message: "Comment added", suggestion });
});

const approveAsSeller = asyncHandler(async (req, res) => {
  res.status(400).json({
    message: "Seller approval is not required in this workflow. Sellers can upload, verify, and suggest modifications."
  });
});

const approveAsBuyer = asyncHandler(async (req, res) => {
  res.status(400).json({
    message: "Buyer approval is not required in this workflow. Buyers can review, verify, and suggest modifications."
  });
});

const approveAsLegal = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar or Admin can mark document review complete" });
  }

  document.approvals.legalApproved = true;
  await document.save();
  res.json({ message: "Review completion recorded", approvals: document.approvals });
});

const approveAsRegistrar = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar can approve registrar stage" });
  }
  if (![DOCUMENT_STATUS.AI_VERIFIED, DOCUMENT_STATUS.ADMIN_APPROVED].includes(document.status)) {
    return res.status(400).json({ message: "AI verification must be completed before registrar approval" });
  }
  if (!document.approvals?.adminApproved) {
    return res.status(400).json({ message: "Admin final approval is required before registrar approval" });
  }

  document.approvals.registrarApproved = true;
  await document.save();
  res.json({ message: "Registrar approval recorded", approvals: document.approvals });
});

const adminDecision = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Admin can finalize authenticity" });
  }
  if (document.status !== DOCUMENT_STATUS.AI_VERIFIED) {
    return res.status(400).json({ message: "Document must be AI Verified before admin decision" });
  }

  const verdict = req.body.verdict;
  if (!["Approved", "Rejected", "CorrectionsRequested"].includes(verdict)) {
    return res.status(400).json({ message: "verdict must be Approved, Rejected, or CorrectionsRequested" });
  }

  document.adminDecision = {
    verdict,
    decidedBy: req.user._id,
    decidedAt: new Date(),
    remarks: req.body.remarks || ""
  };
  document.approvals.adminApproved = verdict === "Approved";
  document.status =
    verdict === "Approved"
      ? DOCUMENT_STATUS.ADMIN_APPROVED
      : verdict === "CorrectionsRequested"
        ? DOCUMENT_STATUS.CORRECTIONS_REQUESTED
        : DOCUMENT_STATUS.ADMIN_REJECTED;
  await document.save();

  await createAuditLog({
    actor: req.user._id,
    action: "DOCUMENT_ADMIN_DECISION",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { verdict, remarks: req.body.remarks || "" },
    ipAddress: req.ip
  });

  res.json({ message: `Document ${verdict.toLowerCase()} by admin`, document });
});

const issueCertificate = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Registrar can issue final certificate" });
  }
  if (!document.isLocked || document.status !== DOCUMENT_STATUS.LOCKED) {
    return res.status(400).json({ message: "Document must be locked before issuing certificate" });
  }

  let certificate = await VerificationCertificate.findOne({ document: document._id });
  if (!certificate) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = Math.floor(10000 + Math.random() * 90000);
    const certificateNumber = `CERT-${datePart}-${suffix}`;
    certificate = await VerificationCertificate.create({
      document: document._id,
      issuedBy: req.user._id,
      certificateNumber,
      remarks: req.body?.remarks || ""
    });
  }

  document.certificateIssued = true;
  document.certificateNumber = certificate.certificateNumber;
  await document.save();

  await createAuditLog({
    actor: req.user._id,
    action: "CERTIFICATE_ISSUED",
    resourceType: "Document",
    resourceId: document._id,
    metadata: { certificateNumber: certificate.certificateNumber },
    ipAddress: req.ip
  });

  res.json({ message: "Final verification certificate issued", certificate });
});

const getCertificate = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate("uploadedBy", "name email role")
    .populate("sourceDocument", "title propertyId documentType")
    .populate("latestVerificationReport");
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const certificate = await VerificationCertificate.findOne({ document: document._id })
    .populate("issuedBy", "name role")
    .populate("document");
  if (!certificate) {
    return res.status(404).json({ message: "Certificate not found" });
  }

  const verificationReport = await VerificationReport.findOne({ documentId: document._id })
    .populate("verifiedBy", "name role")
    .sort({ createdAt: -1 });

  const pdfBuffer = await generateCertificatePdfBuffer({
    document,
    certificate,
    verificationReport,
    issuedByName: certificate.issuedBy?.name
  });

  const download = req.query?.download === "1" || req.query?.download === "true";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", pdfBuffer.length);
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(
      `${document.fileName || document.title || "certificate"}`.replace(/\.[^.]+$/, "")
    )}-certificate.pdf"`
  );
  res.send(pdfBuffer);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canDeleteDocument(document, req.user)) {
    return res.status(403).json({ message: "Only the document owner, Registrar, or Admin can delete documents" });
  }
  if (document.status === DOCUMENT_STATUS.LOCKED) {
    return res.status(400).json({ message: "Locked documents cannot be deleted" });
  }

  const linkedCopies = await Document.countDocuments({ sourceDocument: document._id });
  if (linkedCopies > 0) {
    return res.status(400).json({ message: "This original document has linked copies and cannot be deleted" });
  }

  const shouldRemoveBlockchainRecord = isDemoOrTestDocument(document);

  await createAuditLog({
    actor: req.user._id,
    action: "DELETE_DOCUMENT",
    resourceType: "Document",
    resourceId: document._id,
    metadata: {
      documentId: document._id.toString(),
      userId: req.user._id.toString(),
      role: req.user.role,
      timestamp: new Date().toISOString(),
      title: document.title,
      propertyId: document.propertyId,
      status: document.status
    },
    ipAddress: req.ip
  });

  await Promise.all([
    DocumentVersion.deleteMany({ document: document._id }),
    VerificationCertificate.deleteMany({ document: document._id }),
    VerificationReport.deleteMany({ documentId: document._id }),
    Suggestion.deleteMany({ document: document._id }),
    shouldRemoveBlockchainRecord ? BlockchainRecord.deleteMany({ document: document._id }) : Promise.resolve()
  ]);

  await document.deleteOne();

  try {
    await removeStoredFile(document);
  } catch (storageError) {
    console.warn(`Failed to remove stored file for deleted document ${document._id}:`, storageError.message);
  }

  res.json({ message: "Document verification record deleted successfully." });
});

module.exports = {
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
};
