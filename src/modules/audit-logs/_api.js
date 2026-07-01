const router = require("express").Router();
const isLoggedIn = require("../../shared/auth/isLoggeddIn");
const hasRole = require("../../shared/auth/has-role");
const controller = require("./_controllers");

router.get(
  "/audit-logs",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  controller.listAuditLogs,
);

module.exports = router;
