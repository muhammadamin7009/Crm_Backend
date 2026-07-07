const Joi = require("joi");
const { PERMISSIONS } = require("../../shared/auth/permissions");

const permissionKeys = PERMISSIONS.map((item) => item.key);

exports.updateUserPermissionsSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    permissions: Joi.array().items(Joi.string().valid(...permissionKeys)).unique().required(),
  }),
};
