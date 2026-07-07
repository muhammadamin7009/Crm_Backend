const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const controller = require("./_controllers");

const superAdminOnly = [isLoggedIn, hasRole("super_admin")];

router.get("/permissions", ...superAdminOnly, controller.listPermissions);
router.get("/permissions/users/:id", ...superAdminOnly, controller.getUserPermissions);
router.put("/permissions/users/:id", ...superAdminOnly, controller.updateUserPermissions);

module.exports = router;
