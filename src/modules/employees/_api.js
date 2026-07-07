const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const c = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("employees.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("employees.manage")];

router.get("/positions", ...viewManager, c.listPositions);
router.post("/positions", ...manageManager, c.createPosition);
router.patch("/positions/:id", ...manageManager, c.updatePosition);
router.get("/employees", ...viewManager, c.listProfiles);
router.post("/employees", ...manageManager, c.createProfile);
router.patch("/employees/:id", ...manageManager, c.updateProfile);
router.get("/employees/:id/agreements", ...viewManager, c.agreementHistory);
router.post("/employee-agreements", ...manageManager, c.createAgreement);

module.exports = router;
