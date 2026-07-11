const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const {
  createCategory,
  getCategories,
  getCategory,
  patchCategory,
  removeCategory,
} = require("./_controllers");

router.get("/categories", isLoggedIn, hasPermission("products.view"), getCategories);
router.get("/categories/:id", isLoggedIn, hasPermission("products.view"), getCategory);
router.post(
  "/categories",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("products.manage"),
  createCategory,
);
router.patch(
  "/categories/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("products.manage"),
  patchCategory,
);
router.delete(
  "/categories/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("products.manage"),
  removeCategory,
);

module.exports = router;
