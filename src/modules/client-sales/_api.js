const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createClientSale,
  createBulkClientSale,
  getClientSales,
  getClientSale,
  getClientSalesSummary,
  getClientBalance,
  getMyClientAccount,
  patchClientSale,
  removeClientSale,
} = require("./_controllers");

router.get(
  "/client-sales/me",
  isLoggedIn,
  hasRole("client"),
  getMyClientAccount,
);

router.get(
  "/client-sales",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientSales,
);
router.get(
  "/client-sales/summary",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientSalesSummary,
);
router.get(
  "/client-sales/balance",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientBalance,
);
router.get(
  "/client-sales/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getClientSale,
);
router.post(
  "/client-sales/bulk",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createBulkClientSale,
);
router.post(
  "/client-sales",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createClientSale,
);
router.patch(
  "/client-sales/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchClientSale,
);
router.delete(
  "/client-sales/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeClientSale,
);

module.exports = router;
