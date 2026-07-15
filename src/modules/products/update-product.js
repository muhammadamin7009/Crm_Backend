const db = require("../../db");
const {
  getExistingProduct,
  resolveCategory,
  canonicalizeProductOption,
  generateUniqueSku,
  emptyToNull,
} = require("./helpers");

const updateProduct = async (body, { id }, actor) => {
  const existing = await getExistingProduct(id);

  const { category_name: _categoryName, ...bodyWithoutCategoryName } = body;
  const patch = { ...bodyWithoutCategoryName, updated_at: db.fn.now() };
  patch.unit = "par";

  if (body.category_id !== undefined || body.category_name !== undefined) {
    patch.category_id = await resolveCategory(body, actor);
  }

  for (const field of ["model", "color"]) {
    if (patch[field] !== undefined) {
      patch[field] = await canonicalizeProductOption(field, patch[field]);
    }
  }

  if (patch.description !== undefined) patch.description = emptyToNull(patch.description);

  const nextName = patch.name ?? existing.name;
  const nextColor = patch.color !== undefined ? patch.color : existing.color;
  const identityChanged =
    String(nextName).trim().toLowerCase() !== String(existing.name).trim().toLowerCase() ||
    String(nextColor || "")
      .trim()
      .toLowerCase() !==
      String(existing.color || "")
        .trim()
        .toLowerCase();

  if (identityChanged) patch.sku = await generateUniqueSku(nextName, nextColor, id);

  const [product] = await db("products")
    .where({ id })
    .update(patch)
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

  return { updated_product: product };
};

module.exports = updateProduct;
