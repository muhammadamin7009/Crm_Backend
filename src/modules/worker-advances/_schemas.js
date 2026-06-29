const Joi = require("joi");

const idParams = Joi.object({ id: Joi.number().integer().positive().required() });
const fields = {
  worker_id: Joi.number().integer().positive(),
  amount: Joi.number().precision(2).positive(),
  given_at: Joi.date().iso(),
  note: Joi.string().trim().allow(null, ""),
};

exports.createWorkerAdvanceSchema = {
  body: Joi.object({ ...fields, worker_id: fields.worker_id.required(), amount: fields.amount.required() }),
};
exports.updateWorkerAdvanceSchema = { params: idParams, body: Joi.object(fields).min(1) };
exports.showWorkerAdvanceSchema = { params: idParams };
exports.deleteWorkerAdvanceSchema = { params: idParams };
exports.listWorkerAdvancesSchema = {
  query: Joi.object({
    q: Joi.string().trim().allow(""),
    worker_id: Joi.number().integer().positive(),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort_by: Joi.string().valid("given_at", "created_at", "updated_at", "amount").default("given_at"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};
exports.workerAdvanceBalanceSchema = {
  query: Joi.object({ worker_id: Joi.number().integer().positive() }),
};
