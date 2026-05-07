const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  actor,
  action,
  resourceType,
  resourceId,
  metadata = {},
  ipAddress = ""
}) => {
  await AuditLog.create({
    actor,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress
  });
};

module.exports = { createAuditLog };
