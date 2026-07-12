const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const itemType = Joi.string().valid("product", "raw_material");

const paging = {
  q: Joi.string().allow("").max(120).default(""),
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
};

exports.listWarehouses = {
  query: Joi.object({
    include_inactive: Joi.boolean().default(false),
  }),
};

exports.createWarehouse = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]+$/).min(2).max(40).required(),
    location: Joi.string().trim().allow("", null).max(255),
    is_default: Joi.boolean().default(false),
  }),
};

exports.updateWarehouse = {
  params: idParams,
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120),
    code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]+$/).min(2).max(40),
    location: Joi.string().trim().allow("", null).max(255),
    is_default: Joi.boolean(),
  }).min(1),
};

exports.id = { params: idParams };

exports.listStock = {
  query: Joi.object({
    ...paging,
    warehouse_id: Joi.number().integer().positive(),
    item_type: itemType,
    low_only: Joi.boolean().default(false),
  }),
};

exports.listItems = {
  query: Joi.object({
    q: Joi.string().allow("").max(120).default(""),
    item_type: itemType,
    limit: Joi.number().integer().min(1).max(300).default(200),
  }),
};

exports.updateThreshold = {
  params: idParams,
  body: Joi.object({
    minimum_quantity: Joi.number().min(0).precision(3).required(),
  }),
};

exports.listMovements = {
  query: Joi.object({
    ...paging,
    warehouse_id: Joi.number().integer().positive(),
    item_type: itemType,
    movement_type: Joi.string().valid(
      "opening",
      "in",
      "out",
      "adjustment",
      "transfer_in",
      "transfer_out",
    ),
    date_from: Joi.date().iso(),
    date_to: Joi.date().iso(),
  }),
};

exports.createMovement = {
  body: Joi.object({
    warehouse_id: Joi.number().integer().positive().required(),
    item_type: itemType.required(),
    item_id: Joi.number().integer().positive().required(),
    movement_type: Joi.string().valid("opening", "in", "out", "adjustment").required(),
    quantity: Joi.number().precision(3).invalid(0).required(),
    unit_cost: Joi.number().min(0).precision(2).allow(null),
    occurred_at: Joi.date().iso(),
    note: Joi.string().trim().allow("", null).max(1000),
    reference_type: Joi.string().trim().allow("", null).max(40),
    reference_id: Joi.string().trim().allow("", null).max(80),
    idempotency_key: Joi.string().trim().max(100),
  }),
};

exports.createTransfer = {
  body: Joi.object({
    from_warehouse_id: Joi.number().integer().positive().required(),
    to_warehouse_id: Joi.number().integer().positive().required(),
    item_type: itemType.required(),
    item_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().positive().precision(3).required(),
    occurred_at: Joi.date().iso(),
    note: Joi.string().trim().allow("", null).max(1000),
    idempotency_key: Joi.string().trim().max(90),
  }).custom((value, helpers) =>
    Number(value.from_warehouse_id) === Number(value.to_warehouse_id)
      ? helpers.error("any.invalid")
      : value,
  ),
};
