const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    suggestionText: { type: String, required: true, trim: true },
    context: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending"
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewNote: { type: String, default: "", trim: true },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Suggestion", suggestionSchema);
