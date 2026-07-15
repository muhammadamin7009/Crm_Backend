const multer = require("multer");
const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
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
  getProductOptions,
  patchProductOption,
  removeProductOption,
  getProductRecipe,
  putProductRecipe,
} = require("./_controllers");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new BadRequestError("Faqat JPEG, PNG yoki WebP rasm yuklash mumkin"));
    }

    callback(null, true);
  },
});

const managerView = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("products.view")];
const managerManage = [
  isLoggedIn,
  hasRole("super_admin", "admin"),
  hasPermission("products.manage"),
];

router.get("/products", isLoggedIn, hasPermission("products.view"), getProducts);
router.get("/product-options", isLoggedIn, hasPermission("products.view"), getProductOptions);
router.patch("/product-options/:type", ...managerManage, patchProductOption);
router.delete("/product-options/:type", ...managerManage, removeProductOption);
router.get("/products/:id", isLoggedIn, hasPermission("products.view"), getProduct);
router.get("/products/:id/recipe", ...managerView, getProductRecipe);
router.put("/products/:id/recipe", ...managerManage, putProductRecipe);
router.post("/products", ...managerManage, createProduct);
router.patch("/products/:id", ...managerManage, patchProduct);
router.delete("/products/:id", ...managerManage, removeProduct);
router.get("/products/:id/department-prices", ...managerView, getProductDepartmentPrices);
router.put("/products/:id/department-prices", ...managerManage, putProductDepartmentPrices);
router.patch(
  "/products/:id/department-prices/:departmentId",
  ...managerManage,
  patchProductDepartmentPrice,
);
router.post(
  "/products/:id/images",
  ...managerManage,
  upload.single("product_image"),
  addProductImage,
);
router.patch("/products/:id/images/:imageId/primary", ...managerManage, setPrimaryProductImage);
router.delete("/products/:id/images/:imageId", ...managerManage, removeProductImage);

module.exports = router;
