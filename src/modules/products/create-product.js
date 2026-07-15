const db = require("../../db");
const {
  resolveCategory,
  canonicalizeProductOption,
  generateUniqueSku,
  emptyToNull,
} = require("./helpers");

const createProduct = async (body, actor) => {
  const categoryId = await resolveCategory(body, actor);
  const [model, color] = await Promise.all([
    canonicalizeProductOption("model", body.model),
    canonicalizeProductOption("color", body.color),
  ]);
  const sku = await generateUniqueSku(body.name, color);

  const [product] = await db("products")
    .insert({
      category_id: categoryId,
      name: body.name,
      model: emptyToNull(model),
      sku,
      color: emptyToNull(color),
      unit: "par",
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
