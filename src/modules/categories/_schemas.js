const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

exports.createCategorySchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().allow(null, ""),
    is_active: Joi.boolean().default(true),
  }),
};

exports.updateCategorySchema = {
  params: idParams,
  body: Joi.object({
    name: Joi.string().trim().max(100),
    description: Joi.string().trim().allow(null, ""),
    is_active: Joi.boolean(),
  }).min(1),
};

exports.showCategorySchema = { params: idParams };
exports.deleteCategorySchema = { params: idParams };

exports.listCategoriesSchema = {
  query: Joi.object({
    q: Joi.string().trim().allow(""),
    is_active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort_by: Joi.string().valid("name", "created_at", "updated_at").default("created_at"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};
