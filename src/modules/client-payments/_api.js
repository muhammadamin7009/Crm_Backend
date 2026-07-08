const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const {
  createClientPayment,
  getClientPayments,
  getClientPayment,
  getClientPaymentsSummary,
  patchClientPayment,
  removeClientPayment,
} = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("client_sales.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("client_sales.manage")];
const superAdminOnly = [isLoggedIn, hasRole("super_admin")];

router.get("/client-payments", ...viewManager, getClientPayments);
router.get("/client-payments/summary", ...superAdminOnly, getClientPaymentsSummary);
router.get("/client-payments/:id", ...viewManager, getClientPayment);
router.post("/client-payments", ...manageManager, createClientPayment);
router.patch("/client-payments/:id", ...manageManager, patchClientPayment);
router.delete("/client-payments/:id", ...manageManager, removeClientPayment);

module.exports = router;
