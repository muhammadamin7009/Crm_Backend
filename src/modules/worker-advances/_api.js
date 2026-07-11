const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const c = require("./_controllers");

const viewAdvance = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("payroll.view"),
];
const manageAdvance = [
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("payroll.manage"),
];

router.get(
  "/worker-advances",
  ...viewAdvance,
  c.getWorkerAdvances,
);
router.get(
  "/worker-advances/balance",
  ...viewAdvance,
  c.getWorkerAdvanceBalance,
);
router.get(
  "/worker-advances/:id",
  ...viewAdvance,
  c.getWorkerAdvance,
);
router.post("/worker-advances", ...manageAdvance, c.createWorkerAdvance);
router.patch(
  "/worker-advances/:id",
  ...manageAdvance,
  c.patchWorkerAdvance,
);
router.delete(
  "/worker-advances/:id",
  ...manageAdvance,
  c.removeWorkerAdvance,
);

module.exports = router;
