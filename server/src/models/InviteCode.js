const mongoose = require("mongoose");
const { USER_ROLES } = require("../utils/constants");

const inviteCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: [USER_ROLES.REGISTRAR],
      required: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InviteCode", inviteCodeSchema);
