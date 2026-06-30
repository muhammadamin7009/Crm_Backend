const Joi = require("joi");
const id = Joi.number().integer().positive();
const params = Joi.object({ id: id.required() });
const dates = {
  date_from: Joi.date().iso(),
  date_to: Joi.date().iso(),
};

exports.list = { query: Joi.object({ ...dates, limit: Joi.number().integer().min(1).max(100).default(50), offset: Joi.number().integer().min(0).default(0) }) };
exports.id = { params };
exports.payrollCreate = { body: Joi.object({ period_from: Joi.date().iso().required(), period_to: Joi.date().iso().required(), payment_date: Joi.date().iso().required(), note: Joi.string().allow(null, "") }) };
exports.payrollLineUpdate = { params, body: Joi.object({ daily_earnings: Joi.number().min(0), bonus: Joi.number().min(0), advance_deduction: Joi.number().min(0), other_deduction: Joi.number().min(0), cash_amount: Joi.number().min(0), note: Joi.string().allow(null, "") }).min(1) };
exports.categoryCreate = { body: Joi.object({ name: Joi.string().trim().max(100).required(), description: Joi.string().allow(null, "") }) };
exports.expenseCreate = { body: Joi.object({ category_id: id.required(), account_id: id.allow(null, ""), title: Joi.string().trim().max(160).required(), amount: Joi.number().positive().required(), spent_at: Joi.date().iso(), note: Joi.string().allow(null, "") }) };
exports.accountCreate = { body: Joi.object({ name: Joi.string().trim().max(100).required(), account_type: Joi.string().valid("cash", "card", "bank").required(), opening_balance: Joi.number().default(0) }) };
exports.transactionCreate = { body: Joi.object({ account_id: id.required(), transaction_type: Joi.string().valid("income", "expense").required(), amount: Joi.number().positive().required(), transacted_at: Joi.date().iso(), description: Joi.string().allow(null, "") }) };
exports.returnCreate = { body: Joi.object({ client_sale_id: id.required(), quantity: Joi.number().positive().required(), returned_at: Joi.date().iso(), reason: Joi.string().allow(null, "") }) };
