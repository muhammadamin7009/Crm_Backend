const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const c = require("./_controllers");
const manager = [isLoggedIn, hasRole("super_admin", "admin")];

router.get("/suppliers", ...manager, c.listSuppliers);
router.post("/suppliers", ...manager, c.createSupplier);
router.patch("/suppliers/:id", ...manager, c.updateSupplier);
router.delete("/suppliers/:id", ...manager, c.deleteSupplier);

router.get("/raw-materials", ...manager, c.listMaterials);
router.post("/raw-materials", ...manager, c.createMaterial);
router.patch("/raw-materials/:id", ...manager, c.updateMaterial);
router.delete("/raw-materials/:id", ...manager, c.deleteMaterial);

router.get("/material-purchases", ...manager, c.listPurchases);
router.get("/material-purchases/balance", ...manager, c.supplierBalance);
router.post("/material-purchases", ...manager, c.createPurchase);
router.patch("/material-purchases/:id", ...manager, c.updatePurchase);
router.delete("/material-purchases/:id", ...manager, c.deletePurchase);

router.get("/supplier-payments", ...manager, c.listSupplierPayments);
router.post("/supplier-payments", ...manager, c.createSupplierPayment);

module.exports = router;
