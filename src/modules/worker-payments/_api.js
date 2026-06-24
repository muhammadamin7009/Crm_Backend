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

router.get("/worker-payments", isLoggedIn, getWorkerPayments);
router.get("/worker-payments/summary", isLoggedIn, getWorkerPaymentsSummary);
router.get("/worker-payments/balance", isLoggedIn, getWorkerBalance);
router.get("/worker-payments/:id", isLoggedIn, getWorkerPayment);
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
