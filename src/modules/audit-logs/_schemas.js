const Joi = require("joi");

exports.listAuditLogs = {
  query: Joi.object({
    q: Joi.string().allow("").default(""),
    action: Joi.string().valid("", "POST", "PUT", "PATCH", "DELETE").default(""),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),
};
