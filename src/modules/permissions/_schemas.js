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

exports.applyPermissionPresetSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    preset_key: Joi.string().valid("sales_admin", "production_admin", "accountant", "materials_admin").required(),
  }),
};
