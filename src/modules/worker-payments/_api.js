const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const {
  createWorkerPayment,
  getWorkerPayments,
  getWorkerPaymentsSummary,
  getWorkerBalance,
  getWorkerDues,
  getWorkerPayment,
  patchWorkerPayment,
  removeWorkerPayment,
} = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin", "worker"), hasPermission("payroll.view")];
const managerViewOnly = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("payroll.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("payroll.manage")];

router.get("/worker-payments", ...viewManager, getWorkerPayments);
router.get("/worker-payments/summary", ...viewManager, getWorkerPaymentsSummary);
router.get("/worker-payments/balance", ...viewManager, getWorkerBalance);
router.get("/worker-payments/due", ...managerViewOnly, getWorkerDues);
router.get("/worker-payments/:id", ...viewManager, getWorkerPayment);
router.post("/worker-payments", ...manageManager, createWorkerPayment);
router.patch("/worker-payments/:id", ...manageManager, patchWorkerPayment);
router.delete("/worker-payments/:id", ...manageManager, removeWorkerPayment);

module.exports = router;
