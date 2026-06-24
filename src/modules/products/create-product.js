const db = require("../../db");
const {
  ensureCategory,
  ensureUniqueSku,
  emptyToNull,
} = require("./helpers");

const createProduct = async (body, actor) => {
  await Promise.all([
    ensureCategory(body.category_id),
    ensureUniqueSku(body.sku),
  ]);

  const [product] = await db("products")
    .insert({
      category_id: body.category_id || null,
      name: body.name,
      model: emptyToNull(body.model),
      sku: body.sku,
      color: emptyToNull(body.color),
      unit: body.unit || "dona",
      description: emptyToNull(body.description),
      purchase_price: body.purchase_price ?? 0,
      sale_price: body.sale_price,
      is_active: body.is_active ?? true,
      is_deleted: false,
      created_by: actor.id,
    })
    .returning([
      "id",
      "category_id",
      "name",
      "model",
      "sku",
      "color",
      "unit",
      "description",
      "purchase_price",
      "sale_price",
      "is_active",
      "created_by",
      "created_at",
      "updated_at",
    ]);

  return { new_product: product };
};

module.exports = createProduct;
