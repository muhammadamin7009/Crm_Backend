const multer = require("multer");
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const { BadRequestError } = require("../../shared/errors");
const enforceUserLimit = require("../../shared/middlewares/enforce-user-limit");
const rateLimit = require("../../shared/middlewares/rate-limit");
const {
  getUsers,
  getUser,
  getMe,
  loginUser,
  verifyLogin,
  getSessions,
  removeSession,
  removeOtherSessions,
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Kirish uchun juda ko'p urinish qilindi. 15 daqiqadan keyin qayta urinib ko'ring",
});
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Tasdiqlash uchun juda ko'p urinish qilindi. Birozdan keyin qayta urinib ko'ring",
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Bu manzildan juda ko'p ro'yxatdan o'tish so'rovi yuborildi",
});

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new BadRequestError("Faqat JPEG, PNG yoki WebP rasm yuklash mumkin"));
    }

    callback(null, true);
  },
});

router.post("/users/login", loginLimiter, loginUser);
router.post("/users/login/verify", verifyLimiter, verifyLogin);
router.get("/users/me/sessions", isLoggedIn, getSessions);
router.delete("/users/me/sessions/others", isLoggedIn, removeOtherSessions);
router.delete("/users/me/sessions/:id", isLoggedIn, removeSession);
router.post(
  "/users/admin",
  [isLoggedIn, hasRole("super_admin"), hasPermission("users.manage"), enforceUserLimit],
  postUserByAdmin,
);
router.post(
  "/users/staff",
  [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("users.manage"), enforceUserLimit],
  postUserByStaff,
);
// Eski frontendlar uchun vaqtinchalik alias.
router.post(
  "/users/stuff",
  [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("users.manage"), enforceUserLimit],
  postUserByStaff,
);
router.post("/users", registrationLimiter, enforceUserLimit, postUser);
router.get("/users", isLoggedIn, hasRole("super_admin", "admin", "worker"), hasPermission("users.view", "client_sales.view", "production.view", "payroll.view"), getUsers);
router.get("/users/me", isLoggedIn, getMe);
router.get("/users/:id", isLoggedIn, hasRole("super_admin", "admin"), hasPermission("users.view"), getUser);
router.patch("/users/me", isLoggedIn, patchMe);
router.patch("/me/image", isLoggedIn, upload.single("user_image"), patchUserImage);
router.patch("/users/:id", isLoggedIn, hasRole("super_admin", "admin"), hasPermission("users.manage"), patchUser);
router.delete("/users/:id", [isLoggedIn, hasRole("super_admin")], deleteUser);
router.patch("/users/:id/restore", [isLoggedIn, hasRole("super_admin")], restoreUser);
router.delete("/users/:id/permanent", [isLoggedIn, hasRole("super_admin")], permanentlyDeleteUser);

module.exports = router;



