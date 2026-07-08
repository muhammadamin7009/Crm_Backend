const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
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

const viewManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("client_sales.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("client_sales.manage")];
const superAdminOnly = [isLoggedIn, hasRole("super_admin")];

router.get("/client-sales/me", isLoggedIn, hasRole("client"), getMyClientAccount);
router.get("/client-sales", ...viewManager, getClientSales);
router.get("/client-sales/summary", ...superAdminOnly, getClientSalesSummary);
router.get("/client-sales/balance", ...viewManager, getClientBalance);
router.get("/client-sales/:id", ...viewManager, getClientSale);
router.post("/client-sales/bulk", ...manageManager, createBulkClientSale);
router.post("/client-sales", ...manageManager, createClientSale);
router.patch("/client-sales/:id", ...manageManager, patchClientSale);
router.delete("/client-sales/:id", ...manageManager, removeClientSale);

module.exports = router;
