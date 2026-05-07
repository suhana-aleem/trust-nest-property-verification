const USER_ROLES = {
  ADMIN: "Admin",
  LEGAL_OFFICER: "LegalOfficer",
  BUYER: "Buyer",
  SELLER: "Seller",
  REGISTRAR: "Registrar"
};

const DOCUMENT_STATUS = {
  UPLOADED: "Uploaded",
  AI_VERIFIED: "AI Verified",
  ADMIN_APPROVED: "Admin Approved",
  ADMIN_REJECTED: "Admin Rejected",
  BLOCKCHAIN_REGISTERED: "Blockchain Registered",
  LOCKED: "Locked"
};

module.exports = {
  USER_ROLES,
  DOCUMENT_STATUS
};
