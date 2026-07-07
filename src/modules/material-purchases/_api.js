const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const c = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("material_purchases.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("material_purchases.manage")];

router.get("/suppliers", ...viewManager, c.listSuppliers);
router.post("/suppliers", ...manageManager, c.createSupplier);
router.patch("/suppliers/:id", ...manageManager, c.updateSupplier);
router.delete("/suppliers/:id", ...manageManager, c.deleteSupplier);

router.get("/raw-materials", ...viewManager, c.listMaterials);
router.post("/raw-materials", ...manageManager, c.createMaterial);
router.patch("/raw-materials/:id", ...manageManager, c.updateMaterial);
router.delete("/raw-materials/:id", ...manageManager, c.deleteMaterial);

router.get("/material-purchases", ...viewManager, c.listPurchases);
router.get("/material-purchases/balance", ...viewManager, c.supplierBalance);
router.post("/material-purchases", ...manageManager, c.createPurchase);
router.patch("/material-purchases/:id", ...manageManager, c.updatePurchase);
router.delete("/material-purchases/:id", ...manageManager, c.deletePurchase);

router.get("/supplier-payments", ...viewManager, c.listSupplierPayments);
router.post("/supplier-payments", ...manageManager, c.createSupplierPayment);

module.exports = router;
