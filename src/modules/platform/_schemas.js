const Joi = require("joi");
const id = Joi.number().integer().positive();
exports.login = {
  body: Joi.object({ username: Joi.string().required(), password: Joi.string().required() }),
};
exports.companyCreate = {
  body: Joi.object({
    name: Joi.string().trim().max(150).required(),
    slug: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9-]+$/)
      .max(80)
      .required(),
    phone: Joi.string().allow(null, "").max(30),
    plan_code: Joi.string().valid("plus", "pro", "business", "enterprise").required(),
    super_admin: Joi.object({
      first_name: Joi.string().max(50).required(),
      last_name: Joi.string().max(50).required(),
      username: Joi.string().max(30).required(),
      password: Joi.string().min(6).max(100).required(),
      phone: Joi.string().allow(null, "").max(30),
    }).required(),
    subscription_ends_at: Joi.date().iso().allow(null),
  }),
};
exports.companyUpdate = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({
    name: Joi.string().trim().max(150),
    phone: Joi.string().allow(null, "").max(30),
    status: Joi.string().valid("active", "suspended", "archived"),
    subscription_status: Joi.string().valid("trial", "active", "overdue", "suspended"),
    subscription_ends_at: Joi.date().iso().allow(null),
    plan_code: Joi.string().valid("plus", "pro", "business", "enterprise"),
  }).min(1),
};
exports.companyManagementGet = {
  params: Joi.object({ id: id.required() }),
};
exports.companyManagementUpdate = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({
    company: Joi.object({
      name: Joi.string().trim().max(150),
      phone: Joi.string().allow(null, "").max(30),
    }).min(1),
    super_admin: Joi.object({
      first_name: Joi.string().trim().max(50),
      last_name: Joi.string().trim().max(50),
      username: Joi.string().trim().max(30),
      phone: Joi.string().allow(null, "").max(30),
      password: Joi.string().min(8).max(100),
    }).min(1),
  })
    .or("company", "super_admin")
    .required(),
};
exports.companyDelete = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({ confirm_slug: Joi.string().required() }),
};
exports.paymentCreate = {
  body: Joi.object({
    company_id: id.required(),
    paid_at: Joi.date().iso(),
    period_from: Joi.date().iso().required(),
    period_to: Joi.date().iso().required(),
    discount_type: Joi.string().valid("none", "fixed", "percent").default("none"),
    discount_value: Joi.number().min(0).default(0),
    discount_reason: Joi.string().trim().max(500).allow(null, ""),
    note: Joi.string().trim().max(1000).allow(null, ""),
  }),
};
