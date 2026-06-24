const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createClientPayment,
  getClientPayments,
  getClientPayment,
  getClientPaymentsSummary,
  patchClientPayment,
  removeClientPayment,
} = require("./_controllers");

router.get(
  "/client-payments",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientPayments,
);
router.get(
  "/client-payments/summary",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientPaymentsSummary,
);
router.get(
  "/client-payments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientPayment,
);
router.post(
  "/client-payments",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createClientPayment,
);
router.patch(
  "/client-payments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchClientPayment,
);
router.delete(
  "/client-payments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeClientPayment,
);

module.exports = router;
