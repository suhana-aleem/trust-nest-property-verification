require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ override: true });

const sanitizedKey = (process.env.PRIVATE_KEY || "")
  .trim()
  .replace(/^["']|["']$/g, "");
const validPrivateKey = /^0x[a-fA-F0-9]{64}$/.test(sanitizedKey) ? sanitizedKey : "";

if (sanitizedKey && !validPrivateKey) {
  console.warn("Warning: PRIVATE_KEY format is invalid. Expected 0x + 64 hex chars.");
}

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: validPrivateKey ? [validPrivateKey] : []
    }
  }
};
