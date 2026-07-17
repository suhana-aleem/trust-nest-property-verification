const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { USER_ROLES } = require("../utils/constants");

const getAuditLogs = asyncHandler(async (req, res) => {
  if (![USER_ROLES.ADMIN, USER_ROLES.REGISTRAR].includes(req.user.role)) {
    return res.status(403).json({ message: "Only Admin or Registrar can view audit logs" });
  }

  const { resourceType, resourceId } = req.query;
  const filter = {};
  if (resourceType) filter.resourceType = resourceType;
  if (resourceId) filter.resourceId = resourceId;

  const logs = await AuditLog.find(filter)
    .populate("actor", "name email role")
    .sort({ createdAt: -1 })
    .limit(300);

  res.json({ logs });
});

module.exports = { getAuditLogs };
