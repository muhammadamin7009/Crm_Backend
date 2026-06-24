const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const outputFields = {
  worker_id: Joi.number().integer().positive(),
  product_id: Joi.number().integer().positive(),
  department_id: Joi.number().integer().positive(),
  quantity: Joi.number().precision(2).positive(),
  worked_at: Joi.date().iso(),
  note: Joi.string().trim().allow(null, ""),
};

exports.createWorkerOutputSchema = {
  body: Joi.object({
    ...outputFields,
    worker_id: outputFields.worker_id.required(),
    product_id: outputFields.product_id.required(),
    department_id: outputFields.department_id.required(),
    quantity: outputFields.quantity.required(),
  }),
};

exports.updateWorkerOutputSchema = {
  params: idParams,
  body: Joi.object(outputFields).min(1),
};

exports.showWorkerOutputSchema = { params: idParams };
exports.deleteWorkerOutputSchema = { params: idParams };

const listQuery = {
  q: Joi.string().trim().allow(""),
  worker_id: Joi.number().integer().positive(),
  product_id: Joi.number().integer().positive(),
  department_id: Joi.number().integer().positive(),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort_by: Joi.string()
    .valid("worked_at", "created_at", "updated_at", "quantity", "total_amount")
    .default("worked_at"),
  sort_order: Joi.string().valid("asc", "desc").default("desc"),
};

exports.listWorkerOutputsSchema = {
  query: Joi.object(listQuery),
};

exports.workerOutputsSummarySchema = {
  query: Joi.object({
    ...listQuery,
    group_by: Joi.string()
      .valid("worker", "department", "product", "day")
      .default("worker"),
  }),
};
