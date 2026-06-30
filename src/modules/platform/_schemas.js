const Joi = require("joi");
const id = Joi.number().integer().positive();
exports.login = { body: Joi.object({ username: Joi.string().required(), password: Joi.string().required() }) };
exports.companyCreate = { body: Joi.object({
  name: Joi.string().trim().max(150).required(),
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).max(80).required(),
  phone: Joi.string().allow(null, "").max(30),
  super_admin: Joi.object({ first_name: Joi.string().max(50).required(), last_name: Joi.string().max(50).required(), username: Joi.string().max(30).required(), password: Joi.string().min(6).max(100).required(), phone: Joi.string().allow(null, "").max(30) }).required(),
  subscription_ends_at: Joi.date().iso().allow(null),
}) };
exports.companyUpdate = { params: Joi.object({ id: id.required() }), body: Joi.object({ name: Joi.string().trim().max(150), phone: Joi.string().allow(null, "").max(30), status: Joi.string().valid("active", "suspended", "archived"), subscription_status: Joi.string().valid("trial", "active", "overdue", "suspended"), subscription_ends_at: Joi.date().iso().allow(null) }).min(1) };
exports.paymentCreate = { body: Joi.object({ company_id: id.required(), amount: Joi.number().positive().required(), paid_at: Joi.date().iso(), period_from: Joi.date().iso().allow(null), period_to: Joi.date().iso().allow(null), note: Joi.string().allow(null, "") }) };
