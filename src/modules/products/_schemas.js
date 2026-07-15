const Joi = require("joi");

const idParams = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const productFields = {
  category_id: Joi.number().integer().positive().allow(null),
  category_name: Joi.string().trim().max(100).allow(null, ""),
  name: Joi.string().trim().max(150),
  model: Joi.string().trim().max(100).allow(null, ""),
  color: Joi.string().trim().max(50).allow(null, ""),
  unit: Joi.string().trim().valid("par"),
  description: Joi.string().trim().allow(null, ""),
  purchase_price: Joi.number().precision(2).min(0),
  sale_price: Joi.number().precision(2).min(0),
  is_active: Joi.boolean(),
};

exports.createProductSchema = {
  body: Joi.object({
    ...productFields,
    name: productFields.name.required(),
    sale_price: productFields.sale_price.required(),
  }),
};

exports.updateProductSchema = {
  params: idParams,
  body: Joi.object(productFields).min(1),
};

exports.showProductSchema = { params: idParams };
exports.deleteProductSchema = { params: idParams };

const productOptionParams = Joi.object({
  type: Joi.string().valid("model", "color").required(),
});

exports.updateProductOptionSchema = {
  params: productOptionParams,
  body: Joi.object({
    current_value: Joi.string().trim().required(),
    new_value: Joi.string().trim().required(),
  }),
};

exports.deleteProductOptionSchema = {
  params: productOptionParams,
  body: Joi.object({
    value: Joi.string().trim().required(),
  }),
};

exports.productRecipeSchema = { params: idParams };
exports.updateProductRecipeSchema = {
  params: idParams,
  body: Joi.object({
    completion_department_id: Joi.number().integer().positive().allow(null).required(),
    items: Joi.array()
      .items(
        Joi.object({
          raw_material_id: Joi.number().integer().positive().required(),
          quantity_per_pair: Joi.number().positive().precision(3).required(),
        }),
      )
      .max(100)
      .unique("raw_material_id")
      .required(),
  }),
};

const departmentPriceParams = Joi.object({
  id: Joi.number().integer().positive().required(),
  departmentId: Joi.number().integer().positive().required(),
});

const departmentPriceFields = {
  department_id: Joi.number().integer().positive().required(),
  price_per_unit: Joi.number().precision(2).min(0).required(),
  is_active: Joi.boolean(),
};

exports.listProductDepartmentPricesSchema = { params: idParams };
exports.upsertProductDepartmentPricesSchema = {
  params: idParams,
  body: Joi.object({
    prices: Joi.array().items(Joi.object(departmentPriceFields)).min(1).required(),
  }),
};
exports.updateProductDepartmentPriceSchema = {
  params: departmentPriceParams,
  body: Joi.object({
    price_per_unit: Joi.number().precision(2).min(0).required(),
    is_active: Joi.boolean(),
  }),
};

const imageParams = Joi.object({
  id: Joi.number().integer().positive().required(),
  imageId: Joi.number().integer().positive().required(),
});

exports.addProductImageSchema = { params: idParams };
exports.productImageSchema = { params: imageParams };

exports.listProductsSchema = {
  query: Joi.object({
    q: Joi.string().trim().allow(""),
    category_id: Joi.number().integer().positive(),
    color: Joi.string().trim().max(50),
    model: Joi.string().trim().max(100),
    is_active: Joi.boolean(),
    min_price: Joi.number().min(0),
    max_price: Joi.number().min(0),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sort_by: Joi.string()
      .valid("name", "sale_price", "purchase_price", "created_at", "updated_at")
      .default("created_at"),
    sort_order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};
