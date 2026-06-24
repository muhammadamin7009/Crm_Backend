const httpValidator = require("../../shared/http-validator");
const {
  createCategorySchema,
  updateCategorySchema,
  showCategorySchema,
  deleteCategorySchema,
  listCategoriesSchema,
} = require("./_schemas");
const createCategoryService = require("./create-category");
const listCategoriesService = require("./list-categories");
const showCategoryService = require("./show-category");
const updateCategoryService = require("./update-category");
const deleteCategoryService = require("./delete-category");

const createCategory = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createCategorySchema);
    const result = await createCategoryService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listCategoriesSchema);
    const result = await listCategoriesService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showCategorySchema);
    const result = await showCategoryService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchCategory = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateCategorySchema,
    );
    const result = await updateCategoryService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeCategory = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteCategorySchema);
    const result = await deleteCategoryService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  patchCategory,
  removeCategory,
};
