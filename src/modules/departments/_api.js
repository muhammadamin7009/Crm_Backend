const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createDepartment,
  getDepartments,
  getDepartment,
  patchDepartment,
  removeDepartment,
} = require("./_controllers");

router.get(
  "/departments",
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  getDepartments,
);
router.get(
  "/departments/:id",
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  getDepartment,
);
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
