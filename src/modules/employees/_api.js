const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const c = require("./_controllers");
const manager = [isLoggedIn, hasRole("super_admin", "admin")];

router.get("/positions", ...manager, c.listPositions);
router.post("/positions", ...manager, c.createPosition);
router.patch("/positions/:id", ...manager, c.updatePosition);
router.get("/employees", ...manager, c.listProfiles);
router.post("/employees", ...manager, c.createProfile);
router.patch("/employees/:id", ...manager, c.updateProfile);
router.get("/employees/:id/agreements", ...manager, c.agreementHistory);
router.post("/employee-agreements", ...manager, c.createAgreement);

module.exports = router;
