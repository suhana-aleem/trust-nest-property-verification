const USER_ROLES = {
  ADMIN: "Admin",
  BUYER: "Buyer",
  SELLER: "Seller",
  REGISTRAR: "Registrar"
};

const DOCUMENT_STATUS = {
  UPLOADED: "Uploaded",
  AI_VERIFIED: "AI Verified",
  ADMIN_APPROVED: "Admin Approved",
  ADMIN_REJECTED: "Admin Rejected",
  CORRECTIONS_REQUESTED: "Corrections Requested",
  BLOCKCHAIN_REGISTERED: "Blockchain Registered",
  LOCKED: "Locked"
};

const DOCUMENT_TYPES = {
  ORIGINAL: "Original",
  SUBMITTED_COPY: "SubmittedCopy"
};

module.exports = {
  USER_ROLES,
  DOCUMENT_STATUS,
  DOCUMENT_TYPES
};
