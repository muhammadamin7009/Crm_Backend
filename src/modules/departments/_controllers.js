const httpValidator = require("../../shared/http-validator");
const {
  createDepartmentSchema,
  updateDepartmentSchema,
  showDepartmentSchema,
  deleteDepartmentSchema,
  listDepartmentsSchema,
} = require("./_schemas");
const createDepartmentService = require("./create-department");
const listDepartmentsService = require("./list-departments");
const showDepartmentService = require("./show-department");
const updateDepartmentService = require("./update-department");
const deleteDepartmentService = require("./delete-department");

const createDepartment = async (req, res, next) => {
  try {
    httpValidator({ body: req.body }, createDepartmentSchema);
    const result = await createDepartmentService(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getDepartments = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, listDepartmentsSchema);
    const result = await listDepartmentsService(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getDepartment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, showDepartmentSchema);
    const result = await showDepartmentService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const patchDepartment = async (req, res, next) => {
  try {
    httpValidator(
      { body: req.body, params: req.params },
      updateDepartmentSchema,
    );
    const result = await updateDepartmentService(req.body, {
      id: Number(req.params.id),
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeDepartment = async (req, res, next) => {
  try {
    httpValidator({ params: req.params }, deleteDepartmentSchema);
    const result = await deleteDepartmentService({ id: Number(req.params.id) });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartment,
  patchDepartment,
  removeDepartment,
};
