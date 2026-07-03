const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createCategory,
  getCategories,
  getCategory,
  patchCategory,
  removeCategory,
} = require("./_controllers");

router.get("/categories", isLoggedIn, getCategories);
router.get("/categories/:id", isLoggedIn, getCategory);
router.post("/categories", isLoggedIn, hasRole("super_admin", "admin"), createCategory);
router.patch("/categories/:id", isLoggedIn, hasRole("super_admin", "admin"), patchCategory);
router.delete("/categories/:id", isLoggedIn, hasRole("super_admin", "admin"), removeCategory);

module.exports = router;
