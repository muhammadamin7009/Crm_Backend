const httpValidator = require("../../shared/http-validator");
const {
  createProductSchema,
  updateProductSchema,
  showProductSchema,
  deleteProductSchema,
  listProductsSchema,
  addProductImageSchema,
  productImageSchema,
  listProductDepartmentPricesSchema,
  upsertProductDepartmentPricesSchema,
  updateProductDepartmentPriceSchema,
} = require("./_schemas");
const createProductService = require("./create-product");
const listProductsService = require("./list-products");
const showProductService = require("./show-product");
const updateProductService = require("./update-product");
const deleteProductService = require("./delete-product");
const addProductImageService = require("./add-product-image");
const setPrimaryProductImageService = require("./set-primary-product-image");
const deleteProductImageService = require("./delete-product-image");
const listProductDepartmentPricesService = require("./list-product-department-prices");
const upsertProductDepartmentPricesService = require("./upsert-product-department-prices");
const updateProductDepartmentPriceService = require("./update-product-department-price");

const createProduct = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createProductSchema);
    const result = await createProductService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listProductsSchema);
    const result = await listProductsService(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showProductSchema);
    const result = await showProductService({ id: Number(req.params.id) }, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchProduct = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateProductSchema,
    );
    const result = await updateProductService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeProduct = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteProductSchema);
    const result = await deleteProductService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getProductDepartmentPrices = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, listProductDepartmentPricesSchema);
    const result = await listProductDepartmentPricesService({
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const putProductDepartmentPrices = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      upsertProductDepartmentPricesSchema,
    );
    const result = await upsertProductDepartmentPricesService(
      { id: Number(req.params.id) },
      req.body.prices,
      req.user,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchProductDepartmentPrice = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateProductDepartmentPriceSchema,
    );
    const result = await updateProductDepartmentPriceService(
      {
        id: Number(req.params.id),
        departmentId: Number(req.params.departmentId),
      },
      req.body,
      req.user,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addProductImage = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, addProductImageSchema);
    const result = await addProductImageService(req.file, {
      id: Number(req.params.id),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const setPrimaryProductImage = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, productImageSchema);
    const result = await setPrimaryProductImageService({
      id: Number(req.params.id),
      imageId: Number(req.params.imageId),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeProductImage = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, productImageSchema);
    const result = await deleteProductImageService({
      id: Number(req.params.id),
      imageId: Number(req.params.imageId),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

