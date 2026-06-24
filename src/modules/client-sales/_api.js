const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createClientSale,
  getClientSales,
  getClientSale,
  getClientSalesSummary,
  getClientBalance,
  patchClientSale,
  removeClientSale,
} = require("./_controllers");

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
