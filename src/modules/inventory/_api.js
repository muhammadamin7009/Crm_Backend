const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const controller = require("./_controllers");

const viewInventory = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("inventory.view", "client_sales.view", "production.view"),
];
const manageInventory = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("inventory.movements", "inventory.manage"),
];
const manageWarehouses = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("inventory.warehouses", "inventory.manage"),
];
const countInventory = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("inventory.count", "inventory.manage"),
];
const receiveProduction = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("inventory.movements", "inventory.manage", "production.manage"),
];

router.get("/warehouses", ...viewInventory, controller.listWarehouses);
router.get("/inventory/summary", ...viewInventory, controller.inventorySummary);
router.post("/warehouses", ...manageWarehouses, controller.createWarehouse);
router.patch("/warehouses/:id", ...manageWarehouses, controller.updateWarehouse);
router.delete("/warehouses/:id", ...manageWarehouses, controller.archiveWarehouse);

router.get("/inventory/stock", ...viewInventory, controller.listStock);
router.get("/inventory/low-stock", ...viewInventory, controller.listLowStock);
router.get("/inventory/items", ...viewInventory, controller.listItems);
router.patch("/inventory/stock/:id", ...manageInventory, controller.updateThreshold);
router.get("/inventory/movements", ...viewInventory, controller.listMovements);
router.post("/inventory/movements", ...manageInventory, controller.createMovement);
router.post(
  "/inventory/production-receipts",
  ...receiveProduction,
  controller.createProductionReceipt,
);
router.post("/inventory/transfers", ...manageInventory, controller.createTransfer);
router.get("/inventory/counts", ...viewInventory, controller.listCounts);
router.get("/inventory/counts/:id", ...viewInventory, controller.getCount);
router.post("/inventory/counts", ...countInventory, controller.createCount);

module.exports = router;
