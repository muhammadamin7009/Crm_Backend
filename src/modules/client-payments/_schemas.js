const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const paymentFields = {
  client_id: Joi.number().integer().positive(),
  client_sale_id: Joi.number().integer().positive().allow(null, ""),
  amount: Joi.number().precision(2).positive(),
  paid_at: Joi.date().iso(),
  note: Joi.string().trim().allow(null, ""),
};

exports.createClientPaymentSchema = {
  body: Joi.object({
    ...paymentFields,
    client_id: paymentFields.client_id.required(),
    amount: paymentFields.amount.required(),
  }),
};

exports.updateClientPaymentSchema = {
  params: idParams,
  body: Joi.object(paymentFields).min(1),
};

exports.showClientPaymentSchema = { params: idParams };
exports.deleteClientPaymentSchema = { params: idParams };

const listQuery = {
  q: Joi.string().trim().allow(""),
  client_id: Joi.number().integer().positive(),
  client_sale_id: Joi.number().integer().positive(),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort_by: Joi.string()
    .valid("paid_at", "created_at", "updated_at", "amount")
    .default("paid_at"),
  sort_order: Joi.string().valid("asc", "desc").default("desc"),
};

exports.listClientPaymentsSchema = {
  query: Joi.object(listQuery),
};

exports.clientPaymentsSummarySchema = {
  query: Joi.object({
    ...listQuery,
    group_by: Joi.string().valid("client", "day").default("client"),
  }),
};
