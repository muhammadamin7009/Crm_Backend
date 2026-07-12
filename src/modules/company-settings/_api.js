const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const { BadRequestError } = require("../../shared/errors");
const controller = require("./_controllers");

const logoDir = path.resolve(__dirname, "../../..", "uploads", "company-logos");
fs.mkdirSync(logoDir, { recursive: true });

const extensionByType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: logoDir,
    filename: (_req, file, callback) =>
      callback(null, `${crypto.randomUUID()}${extensionByType[file.mimetype] || ""}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!extensionByType[file.mimetype]) {
      return callback(new BadRequestError("Logo faqat JPEG, PNG yoki WebP bo'lishi mumkin"));
    }
    callback(null, true);
  },
});

router.get("/company/branding", controller.getBranding);
router.patch(
  "/company/logo",
  isLoggedIn,
  hasRole("super_admin"),
  upload.single("company_logo"),
  controller.updateLogo,
);
router.delete("/company/logo", isLoggedIn, hasRole("super_admin"), controller.deleteLogo);

module.exports = router;
