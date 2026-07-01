const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createWorkerPayment,
  getWorkerPayments,
  getWorkerPaymentsSummary,
  getWorkerBalance,
  getWorkerPayment,
  patchWorkerPayment,
  removeWorkerPayment,
} = require("./_controllers");

router.get("/worker-payments", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerPayments);
router.get("/worker-payments/summary", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerPaymentsSummary);
router.get("/worker-payments/balance", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerBalance);
router.get("/worker-payments/:id", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerPayment);
router.post(
  "/worker-payments",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createWorkerPayment,
);
router.patch(
  "/worker-payments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchWorkerPayment,
);
router.delete(
  "/worker-payments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeWorkerPayment,
);

module.exports = router;
