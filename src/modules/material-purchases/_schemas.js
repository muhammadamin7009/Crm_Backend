const Joi = require("joi");

const id = Joi.number().integer().positive();
const params = Joi.object({ id: id.required() });

exports.createSupplierSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(120).required(),
    phone: Joi.string().max(30).allow(null, ""),
    address: Joi.string().max(255).allow(null, ""),
    opening_balance: Joi.number().precision(2).min(0).default(0),
    note: Joi.string().allow(null, ""),
  }),
};
exports.updateSupplierSchema = {
  params,
  body: Joi.object({
    name: Joi.string().trim().max(120),
    phone: Joi.string().max(30).allow(null, ""),
    address: Joi.string().max(255).allow(null, ""),
    opening_balance: Joi.number().precision(2).min(0),
    note: Joi.string().allow(null, ""),
  }).min(1),
};

exports.createMaterialSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(120).required(),
    unit: Joi.string().trim().max(30).default("dona"),
    note: Joi.string().allow(null, ""),
  }),
};
exports.updateMaterialSchema = {
  params,
  body: Joi.object({
    name: Joi.string().trim().max(120),
    unit: Joi.string().trim().max(30),
    note: Joi.string().allow(null, ""),
  }).min(1),
};

const item = Joi.object({
  raw_material_id: id.required(),
  quantity: Joi.number().precision(2).positive().required(),
  unit_price: Joi.number().precision(2).min(0).required(),
});
exports.createPurchaseSchema = {
  body: Joi.object({
    supplier_id: id.required(),
    purchased_at: Joi.date().iso(),
    paid_amount: Joi.number().precision(2).min(0).default(0),
    note: Joi.string().allow(null, ""),
    items: Joi.array().items(item).min(1).required(),
  }),
};
exports.updatePurchaseSchema = {
  params,
  body: Joi.object({
    supplier_id: id,
    purchased_at: Joi.date().iso(),
    paid_amount: Joi.number().precision(2).min(0),
    note: Joi.string().allow(null, ""),
    items: Joi.array().items(item).min(1),
  }).min(1),
};

exports.createSupplierPaymentSchema = {
  body: Joi.object({
    supplier_id: id.required(),
    amount: Joi.number().precision(2).positive().required(),
    paid_at: Joi.date().iso(),
    note: Joi.string().allow(null, ""),
  }),
};

const list = {
  q: Joi.string().allow(""),
  supplier_id: id,
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sort_order: Joi.string().valid("asc", "desc").default("desc"),
};
exports.listSchema = { query: Joi.object(list) };
exports.balanceSchema = {
  query: Joi.object({ supplier_id: id, date_from: Joi.date().iso(), date_to: Joi.date().iso() }),
};
exports.idSchema = { params };
