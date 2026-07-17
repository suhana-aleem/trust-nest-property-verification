const mongoose = require("mongoose");

const verificationReportSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    confidenceScore: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["VERIFIED GENUINE", "SUSPICIOUS", "HIGH RISK / FAKE"],
      required: true,
      index: true
    },
    suspiciousAreas: {
      type: [String],
      default: []
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    blockchainHash: {
      type: String,
      default: ""
    },
    signatureScore: {
      type: Number,
      default: null
    },
    forgeryProbability: {
      type: Number,
      default: null
    },
    extractedText: {
      type: String,
      default: ""
    },
    tamperedRegions: {
      type: [String],
      default: []
    },
    verificationSummary: {
      type: String,
      default: ""
    },
    referenceCheck: {
      textMatchScore: { type: Number, default: null },
      titleMatch: { type: Boolean, default: null },
      propertyIdMatch: { type: Boolean, default: null },
      summary: { type: String, default: "" },
      comparedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationReport", verificationReportSchema);
