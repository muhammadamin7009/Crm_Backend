const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const controller = require("./_controllers");

router.get(
  "/audit-logs",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("audit_logs.view"),
  controller.listAuditLogs,
);

module.exports = router;
