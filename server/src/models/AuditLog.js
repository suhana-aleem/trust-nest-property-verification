const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Object, default: {} },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: true }
);

auditLogSchema.pre(["updateOne", "findOneAndUpdate", "updateMany"], function blockUpdates(next) {
  next(new Error("Audit logs are immutable and cannot be modified"));
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
