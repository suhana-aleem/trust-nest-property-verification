const Document = require("../models/Document");
const DocumentVersion = require("../models/DocumentVersion");
const BlockchainRecord = require("../models/BlockchainRecord");
const User = require("../models/User");
const Suggestion = require("../models/Suggestion");
const VerificationCertificate = require("../models/VerificationCertificate");
const asyncHandler = require("../utils/asyncHandler");
const { DOCUMENT_STATUS, USER_ROLES } = require("../utils/constants");
const { createAuditLog } = require("../services/auditService");
const { analyzeDocumentBufferWithAI } = require("../services/aiService");
const { sha256FromBuffer } = require("../utils/hash");
const { storeHashOnChain, verifyHashOnChain } = require("../services/blockchainService");
const {
  storeUploadedFile,
  readStoredFile
} = require("../services/storage/storageService");

const generatePropertyId = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `PROP-${stamp}-${suffix}`;
};

const canAccessDocument = (doc, userId) => {
  if (doc.uploadedBy.toString() === userId.toString()) return true;
  return doc.participants.some((participant) => participant.toString() === userId.toString());
};

const canModerateOrFinalize = (role) =>
  [USER_ROLES.LEGAL_OFFICER, USER_ROLES.REGISTRAR, USER_ROLES.ADMIN].includes(role);

const hasBackofficeAccess = (role) =>
  [USER_ROLES.ADMIN, USER_ROLES.LEGAL_OFFICER, USER_ROLES.REGISTRAR].includes(role);

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Document file is required" });
  }

  const { title, propertyId } = req.body;
  const finalPropertyId = String(propertyId || "").trim() || generatePropertyId();
  const storage = await storeUploadedFile(req.file);

  const document = await Document.create({
    title,
    propertyId: finalPropertyId,
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
    metadata: { fileName: document.fileName, status: document.status },
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
    .sort({ createdAt: -1 });

  return res.json({ documents });
});

const getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id).populate("uploadedBy", "name role");
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!canAccessDocument(document, req.user._id) && !hasBackofficeAccess(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  return res.json({ document });
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

  const roleAllowed = [USER_ROLES.ADMIN, USER_ROLES.LEGAL_OFFICER, USER_ROLES.SELLER, USER_ROLES.BUYER];
  if (!roleAllowed.includes(req.user.role)) {
    return res.status(403).json({ message: "Role not allowed to run AI verification" });
  }
  if ([USER_ROLES.ADMIN, USER_ROLES.LEGAL_OFFICER].includes(req.user.role) && !document.approvals?.legalApproved) {
    return res.status(400).json({ message: "Legal approval is required before AI verification" });
  }

  const fileBuffer = await readStoredFile(document);
  const aiResult = await analyzeDocumentBufferWithAI({
    buffer: fileBuffer,
    fileName: document.fileName
  });

  document.aiAnalysis = {
    signatureScore: aiResult.signature_score,
    forgeryProbability: aiResult.forgery_probability,
    tamperedRegions: aiResult.tampered_regions || [],
    extractedText: aiResult.extracted_text || "",
    analyzedAt: new Date()
  };
  document.currentText = aiResult.extracted_text || document.currentText;
  document.status = DOCUMENT_STATUS.AI_VERIFIED;
  await document.save();

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

  res.json({ message: "AI analysis completed", result: document.aiAnalysis });
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
  if (![USER_ROLES.LEGAL_OFFICER, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Legal Officer can accept/reject suggestions" });
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
    ![USER_ROLES.SELLER, USER_ROLES.BUYER, USER_ROLES.LEGAL_OFFICER, USER_ROLES.ADMIN].includes(
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
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (req.user.role !== USER_ROLES.SELLER) {
    return res.status(403).json({ message: "Only Seller can approve as seller" });
  }
  if (document.uploadedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only uploader seller can approve seller stage" });
  }

  document.approvals.sellerApproved = true;
  await document.save();
  res.json({ message: "Seller approval recorded", approvals: document.approvals });
});

const approveAsBuyer = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (req.user.role !== USER_ROLES.BUYER) {
    return res.status(403).json({ message: "Only Buyer can approve as buyer" });
  }
  if (!canAccessDocument(document, req.user._id)) {
    return res.status(403).json({ message: "Buyer must be participant to approve" });
  }

  document.approvals.buyerApproved = true;
  await document.save();
  res.json({ message: "Buyer approval recorded", approvals: document.approvals });
});

const approveAsLegal = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (![USER_ROLES.LEGAL_OFFICER, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Legal Officer can approve legal stage" });
  }
  if (!document.approvals?.sellerApproved || !document.approvals?.buyerApproved) {
    return res.status(400).json({ message: "Seller and Buyer approvals are required first" });
  }

  document.approvals.legalApproved = true;
  await document.save();
  res.json({ message: "Legal approval recorded", approvals: document.approvals });
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
  if (!["Approved", "Rejected"].includes(verdict)) {
    return res.status(400).json({ message: "verdict must be Approved or Rejected" });
  }

  document.adminDecision = {
    verdict,
    decidedBy: req.user._id,
    decidedAt: new Date(),
    remarks: req.body.remarks || ""
  };
  document.approvals.adminApproved = verdict === "Approved";
  document.status =
    verdict === "Approved" ? DOCUMENT_STATUS.ADMIN_APPROVED : DOCUMENT_STATUS.ADMIN_REJECTED;
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

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
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
  issueCertificate
};
