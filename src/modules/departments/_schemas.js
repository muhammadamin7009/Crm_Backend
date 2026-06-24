const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const departmentFields = {
  name: Joi.string().trim().max(100),
  code: Joi.string()
    .trim()
    .lowercase()
    .max(50)
    .pattern(/^[a-z0-9_]+$/),
  description: Joi.string().trim().allow(null, ""),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
};

exports.createDepartmentSchema = {
  body: Joi.object({
    ...departmentFields,
    name: departmentFields.name.required(),
    code: departmentFields.code.required(),
  }),
};

exports.updateDepartmentSchema = {
  params: idParams,
  body: Joi.object(departmentFields).min(1),
};

exports.showDepartmentSchema = { params: idParams };
exports.deleteDepartmentSchema = { params: idParams };

exports.listDepartmentsSchema = {
  query: Joi.object({
    q: Joi.string().trim().allow(""),
    is_active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort_by: Joi.string()
      .valid("name", "code", "sort_order", "created_at", "updated_at")
      .default("sort_order"),
    sort_order: Joi.string().valid("asc", "desc").default("asc"),
  }),
};
