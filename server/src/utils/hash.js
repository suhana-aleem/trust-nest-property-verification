const crypto = require("crypto");
const fs = require("fs");

const sha256FromFile = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

const sha256FromBuffer = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

module.exports = { sha256FromFile, sha256FromBuffer };
