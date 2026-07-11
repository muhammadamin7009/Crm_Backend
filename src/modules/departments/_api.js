const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const {
  createDepartment,
  getDepartments,
  getDepartment,
  patchDepartment,
  removeDepartment,
} = require("./_controllers");

const viewDepartment = [
  isLoggedIn,
  hasRole("super_admin", "admin", "worker"),
  hasPermission("products.view", "production.view", "employees.view"),
];
const manageDepartment = [
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("products.manage", "production.manage", "employees.manage"),
];

router.get("/departments", ...viewDepartment, getDepartments);
router.get(
  "/departments/:id",
  ...viewDepartment,
  getDepartment,
);
router.post("/departments", ...manageDepartment, createDepartment);
router.patch("/departments/:id", ...manageDepartment, patchDepartment);
router.delete("/departments/:id", ...manageDepartment, removeDepartment);

module.exports = router;
