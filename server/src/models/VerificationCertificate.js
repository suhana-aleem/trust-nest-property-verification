const mongoose = require("mongoose");

const verificationCertificateSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, unique: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    certificateNumber: { type: String, required: true, unique: true, index: true },
    issuedAt: { type: Date, default: Date.now },
    remarks: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationCertificate", verificationCertificateSchema);
