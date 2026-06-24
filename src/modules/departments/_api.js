const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createDepartment,
  getDepartments,
  getDepartment,
  patchDepartment,
  removeDepartment,
} = require("./_controllers");

router.get("/departments", isLoggedIn, getDepartments);
router.get("/departments/:id", isLoggedIn, getDepartment);
router.post(
  "/departments",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createDepartment,
);
router.patch(
  "/departments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchDepartment,
);
router.delete(
  "/departments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeDepartment,
);

module.exports = router;
