const express = require("express");
const { getAuditLogs } = require("../controllers/auditController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/", protect, getAuditLogs);

module.exports = router;
