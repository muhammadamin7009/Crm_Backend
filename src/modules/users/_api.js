const multer = require("multer");
const { isLoggedIn, hasRole } = require("../../shared/auth");
const { BadRequestError } = require("../../shared/errors");
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
  [isLoggedIn, hasRole("super_admin")],
  postUserByAdmin,
);
router.post(
  "/users/staff",
  [isLoggedIn, hasRole("super_admin", "admin")],
  postUserByStaff,
);
// Eski frontendlar uchun vaqtinchalik alias.
router.post(
  "/users/stuff",
  [isLoggedIn, hasRole("super_admin", "admin")],
  postUserByStaff,
);
router.post("/users", postUser);
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

module.exports = router;
