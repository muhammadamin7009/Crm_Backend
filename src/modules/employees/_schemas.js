const Joi = require("joi");
const id = Joi.number().integer().positive();
const params = Joi.object({ id: id.required() });

exports.positionCreate = {
  body: Joi.object({
    name: Joi.string().trim().max(100).required(),
    department_id: id.allow(null, ""),
    description: Joi.string().allow(null, ""),
    is_active: Joi.boolean().default(true),
  }),
};
exports.positionUpdate = {
  params,
  body: Joi.object({
    name: Joi.string().trim().max(100),
    department_id: id.allow(null, ""),
    description: Joi.string().allow(null, ""),
    is_active: Joi.boolean(),
  }).min(1),
};
exports.profileCreate = {
  body: Joi.object({
    user_id: id.required(),
    position_id: id.required(),
    hired_at: Joi.date().iso(),
    terminated_at: Joi.date().iso().allow(null),
    is_active: Joi.boolean().default(true),
    note: Joi.string().allow(null, ""),
  }),
};
exports.profileUpdate = {
  params,
  body: Joi.object({
    position_id: id,
    hired_at: Joi.date().iso(),
    terminated_at: Joi.date().iso().allow(null),
    is_active: Joi.boolean(),
    note: Joi.string().allow(null, ""),
  }).min(1),
};
exports.agreementCreate = {
  body: Joi.object({
    employee_id: id.required(),
    payment_type: Joi.string()
      .valid("piece_rate", "fixed_salary", "daily_rate", "mixed", "commission")
      .required(),
    fixed_amount: Joi.number().min(0).default(0),
    daily_rate: Joi.number().min(0).default(0),
    commission_percent: Joi.number().min(0).max(100).default(0),
    payment_period: Joi.string().valid("weekly", "monthly").default("weekly"),
    effective_from: Joi.date().iso().required(),
    effective_to: Joi.date().iso().allow(null),
    note: Joi.string().allow(null, ""),
  }),
};
exports.list = {
  query: Joi.object({
    q: Joi.string().allow(""),
    is_active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(100).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
};
exports.id = { params };
