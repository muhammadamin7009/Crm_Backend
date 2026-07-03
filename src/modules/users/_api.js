const multer = require("multer");
const { isLoggedIn, hasRole } = require("../../shared/auth");
const { BadRequestError } = require("../../shared/errors");
const enforceUserLimit = require("../../shared/middlewares/enforce-user-limit");
const {
  getUsers,
  getUser,
  getMe,
  loginUser,
  postUser,
  patchUser,
  patchMe,
  deleteUser,
  postUserByAdmin,
  postUserByStaff,
  patchUserImage,
  restoreUser,
  permanentlyDeleteUser,
} = require("./_controllers");

const router = require("express").Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestError("Faqat JPEG, PNG yoki WebP rasm yuklash mumkin"),
      );
    }

    callback(null, true);
  },
});

router.post("/users/login", loginUser);
router.post(
  "/users/admin",
  [isLoggedIn, hasRole("super_admin"), enforceUserLimit],
  postUserByAdmin,
);
router.post(
  "/users/staff",
  [isLoggedIn, hasRole("super_admin", "admin"), enforceUserLimit],
  postUserByStaff,
);
// Eski frontendlar uchun vaqtinchalik alias.
router.post(
  "/users/stuff",
  [isLoggedIn, hasRole("super_admin", "admin"), enforceUserLimit],
  postUserByStaff,
);
router.post("/users", enforceUserLimit, postUser);
router.get("/users", isLoggedIn, hasRole("super_admin", "admin", "worker"), getUsers);
router.get("/users/me", isLoggedIn, getMe);
router.get("/users/:id", isLoggedIn, hasRole("super_admin", "admin"), getUser);
router.patch("/users/me", isLoggedIn, patchMe);
router.patch(
  "/me/image",
  isLoggedIn,
  upload.single("user_image"),
  patchUserImage,
);
router.patch(
  "/users/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchUser,
);
router.delete("/users/:id", [isLoggedIn, hasRole("super_admin")], deleteUser);
router.patch(
  "/users/:id/restore",
  [isLoggedIn, hasRole("super_admin")],
  restoreUser,
);
router.delete(
  "/users/:id/permanent",
  [isLoggedIn, hasRole("super_admin")],
  permanentlyDeleteUser,
);

module.exports = router;
