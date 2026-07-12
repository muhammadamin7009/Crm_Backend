const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const controller = require("./_controllers");

const viewInventory = [
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("inventory.view"),
];
const manageInventory = [
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("inventory.manage"),
];

router.get("/warehouses", ...viewInventory, controller.listWarehouses);
router.post("/warehouses", ...manageInventory, controller.createWarehouse);
router.patch("/warehouses/:id", ...manageInventory, controller.updateWarehouse);
router.delete("/warehouses/:id", ...manageInventory, controller.archiveWarehouse);

router.get("/inventory/stock", ...viewInventory, controller.listStock);
router.get("/inventory/low-stock", ...viewInventory, controller.listLowStock);
router.get("/inventory/items", ...viewInventory, controller.listItems);
router.patch("/inventory/stock/:id", ...manageInventory, controller.updateThreshold);
router.get("/inventory/movements", ...viewInventory, controller.listMovements);
router.post("/inventory/movements", ...manageInventory, controller.createMovement);
router.post("/inventory/transfers", ...manageInventory, controller.createTransfer);

module.exports = router;
