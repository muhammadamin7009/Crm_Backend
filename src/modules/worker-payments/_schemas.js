const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const PAYMENT_TYPES = ["salary", "advance", "bonus", "other"];

const paymentFields = {
  worker_id: Joi.number().integer().positive(),
  amount: Joi.number().precision(2).min(0),
  advance_deduction: Joi.number().precision(2).min(0),
  payment_type: Joi.string().valid(...PAYMENT_TYPES),
  paid_at: Joi.date().iso(),
  period_from: Joi.date().iso().allow(null),
  period_to: Joi.date().iso().allow(null),
  note: Joi.string().trim().allow(null, ""),
};

exports.createWorkerPaymentSchema = {
  body: Joi.object({
    ...paymentFields,
    worker_id: paymentFields.worker_id.required(),
    amount: paymentFields.amount.required(),
    advance_deduction: paymentFields.advance_deduction.default(0),
    payment_type: paymentFields.payment_type.default("salary"),
  }),
};

exports.updateWorkerPaymentSchema = {
  params: idParams,
  body: Joi.object(paymentFields).min(1),
};

exports.showWorkerPaymentSchema = { params: idParams };
exports.deleteWorkerPaymentSchema = { params: idParams };

const listQuery = {
  q: Joi.string().trim().allow(""),
  worker_id: Joi.number().integer().positive(),
  payment_type: Joi.string().valid(...PAYMENT_TYPES),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort_by: Joi.string()
    .valid("paid_at", "created_at", "updated_at", "amount")
    .default("paid_at"),
  sort_order: Joi.string().valid("asc", "desc").default("desc"),
};

exports.listWorkerPaymentsSchema = {
  query: Joi.object(listQuery),
};

exports.workerPaymentsSummarySchema = {
  query: Joi.object({
    ...listQuery,
    group_by: Joi.string()
      .valid("worker", "payment_type", "day")
      .default("worker"),
  }),
};

exports.workerBalanceSchema = {
  query: Joi.object({
    worker_id: Joi.number().integer().positive(),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso(),
  }),
};
