const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const c = require("./_controllers");

router.get("/worker-advances", isLoggedIn, c.getWorkerAdvances);
router.get("/worker-advances/balance", isLoggedIn, c.getWorkerAdvanceBalance);
router.get("/worker-advances/:id", isLoggedIn, c.getWorkerAdvance);
router.post("/worker-advances", isLoggedIn, hasRole("super_admin", "admin"), c.createWorkerAdvance);
router.patch("/worker-advances/:id", isLoggedIn, hasRole("super_admin", "admin"), c.patchWorkerAdvance);
router.delete("/worker-advances/:id", isLoggedIn, hasRole("super_admin", "admin"), c.removeWorkerAdvance);

module.exports = router;
