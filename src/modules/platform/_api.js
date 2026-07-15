const router = require("express").Router();
const c = require("./_controllers");
const isPlatformAdmin = require("../../shared/auth/is-platform-admin");
router.post("/login", c.login);
router.get("/plans", isPlatformAdmin, c.listPlans);
router.get("/companies", isPlatformAdmin, c.listCompanies);
router.post("/companies", isPlatformAdmin, c.createCompany);
router.patch("/companies/:id", isPlatformAdmin, c.updateCompany);
router.get("/companies/:id/management", isPlatformAdmin, c.getCompanyManagement);
router.patch("/companies/:id/management", isPlatformAdmin, c.updateCompanyManagement);
router.delete(
  "/companies/:id/management/authenticator",
  isPlatformAdmin,
  c.resetCompanyAuthenticator,
);
router.delete("/companies/:id", isPlatformAdmin, c.deleteCompany);
router.get("/payments", isPlatformAdmin, c.listPayments);
router.post("/payments", isPlatformAdmin, c.createPayment);
module.exports = router;
