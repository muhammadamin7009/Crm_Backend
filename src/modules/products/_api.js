const multer = require("multer");
const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const { BadRequestError } = require("../../shared/errors");
const {
  createProduct,
  getProducts,
  getProduct,
  patchProduct,
  removeProduct,
  getProductDepartmentPrices,
  putProductDepartmentPrices,
  patchProductDepartmentPrice,
  addProductImage,
  setPrimaryProductImage,
  removeProductImage,
} = require("./_controllers");

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

router.get("/products", isLoggedIn, getProducts);
router.get("/products/:id", isLoggedIn, getProduct);
router.post("/products", isLoggedIn, hasRole("super_admin", "admin"), createProduct);
router.patch("/products/:id", isLoggedIn, hasRole("super_admin", "admin"), patchProduct);
router.delete("/products/:id", isLoggedIn, hasRole("super_admin", "admin"), removeProduct);
router.get(
  "/products/:id/department-prices",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  getProductDepartmentPrices,
);
router.put(
  "/products/:id/department-prices",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  putProductDepartmentPrices,
);
router.patch(
  "/products/:id/department-prices/:departmentId",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchProductDepartmentPrice,
);
router.post(
  "/products/:id/images",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  upload.single("product_image"),
  addProductImage,
);
router.patch(
  "/products/:id/images/:imageId/primary",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  setPrimaryProductImage,
);
router.delete(
  "/products/:id/images/:imageId",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeProductImage,
);

module.exports = router;
