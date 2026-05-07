const mongoose = require("mongoose");

const blockchainRecordSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, unique: true },
    documentHash: { type: String, required: true, index: true },
    transactionHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    network: { type: String, default: "sepolia" },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlockchainRecord", blockchainRecordSchema);
