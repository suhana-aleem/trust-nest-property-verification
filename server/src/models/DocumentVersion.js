const mongoose = require("mongoose");

const documentVersionSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    versionNumber: { type: Number, required: true },
    content: { type: String, required: false },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    operation: {
      type: {
        type: String,
        enum: ["insert", "delete", "set"],
        default: "set"
      },
      position: Number,
      text: String,
      length: Number
    }
  },
  { timestamps: true }
);

documentVersionSchema.index({ document: 1, versionNumber: -1 });

module.exports = mongoose.model("DocumentVersion", documentVersionSchema);
