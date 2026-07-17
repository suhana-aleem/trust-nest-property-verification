const mongoose = require("mongoose");
const { DOCUMENT_STATUS, DOCUMENT_TYPES } = require("../utils/constants");

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    propertyTitle: { type: String, required: true, trim: true },
    propertyId: { type: String, required: true, trim: true, index: true },
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      default: DOCUMENT_TYPES.SUBMITTED_COPY,
      index: true
    },
    sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: "Document", default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storage: {
      provider: { type: String, default: "local" },
      objectKey: { type: String, required: true },
      localPath: { type: String, default: "" },
      publicUrl: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.UPLOADED
    },
    currentText: { type: String, default: "" },
    aiAnalysis: {
      signatureScore: { type: Number, default: null },
      forgeryProbability: { type: Number, default: null },
      tamperedRegions: { type: [String], default: [] },
      extractedText: { type: String, default: "" },
      genuineVerdict: { type: String, default: "" },
      analyzedAt: { type: Date, default: null }
    },
    referenceCheck: {
      textMatchScore: { type: Number, default: null },
      titleMatch: { type: Boolean, default: null },
      propertyIdMatch: { type: Boolean, default: null },
      summary: { type: String, default: "" },
      comparedAt: { type: Date, default: null }
    },
    latestVerificationReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VerificationReport",
      default: null
    },
    approvals: {
      legalApproved: { type: Boolean, default: false },
      adminApproved: { type: Boolean, default: false },
      registrarApproved: { type: Boolean, default: false }
    },
    adminDecision: {
      verdict: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "CorrectionsRequested"],
        default: "Pending"
      },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      decidedAt: { type: Date, default: null },
      remarks: { type: String, default: "" }
    },
    certificateIssued: { type: Boolean, default: false },
    certificateNumber: { type: String, default: "" },
    isLocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
