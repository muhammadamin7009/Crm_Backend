const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const saleFields = {
  client_id: Joi.number().integer().positive(),
  product_id: Joi.number().integer().positive(),
  quantity: Joi.number().precision(2).positive(),
  unit_price: Joi.number().precision(2).min(0),
  paid_amount: Joi.number().precision(2).min(0).default(0),
  sold_at: Joi.date().iso(),
  note: Joi.string().trim().allow(null, ""),
};

exports.createClientSaleSchema = {
  body: Joi.object({
    ...saleFields,
    client_id: saleFields.client_id.required(),
    product_id: saleFields.product_id.required(),
    quantity: saleFields.quantity.required(),
  }),
};

exports.createBulkClientSaleSchema = {
  body: Joi.object({
    client_id: saleFields.client_id.required(),
    paid_amount: saleFields.paid_amount,
    sold_at: saleFields.sold_at,
    note: saleFields.note,
    items: Joi.array()
      .items(
        Joi.object({
          product_id: saleFields.product_id.required(),
          quantity: saleFields.quantity.required(),
          unit_price: saleFields.unit_price,
        }),
      )
      .min(1)
      .max(100)
      .required(),
  }),
};

exports.updateClientSaleSchema = {
  params: idParams,
  body: Joi.object(saleFields).min(1),
};

exports.showClientSaleSchema = { params: idParams };
exports.deleteClientSaleSchema = { params: idParams };

const listQuery = {
  q: Joi.string().trim().allow(""),
  client_id: Joi.number().integer().positive(),
  product_id: Joi.number().integer().positive(),
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort_by: Joi.string()
    .valid("sold_at", "created_at", "updated_at", "total_amount", "debt_amount")
    .default("sold_at"),
  sort_order: Joi.string().valid("asc", "desc").default("desc"),
};

exports.listClientSalesSchema = {
  query: Joi.object(listQuery),
};

exports.clientSalesSummarySchema = {
  query: Joi.object({
    ...listQuery,
    group_by: Joi.string().valid("client", "product", "day").default("client"),
  }),
};

exports.clientBalanceSchema = {
  query: Joi.object({
    client_id: Joi.number().integer().positive(),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso(),
  }),
};
