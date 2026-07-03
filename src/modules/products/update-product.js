const db = require("../../db");
const { ensureCategory, getExistingProduct, ensureUniqueSku, emptyToNull } = require("./helpers");

const updateProduct = async (body, { id }) => {
  const existing = await getExistingProduct(id);

  const checks = [];
  if (body.category_id !== undefined) checks.push(ensureCategory(body.category_id));
  if (body.sku && body.sku.toLowerCase() !== existing.sku.toLowerCase()) {
    checks.push(ensureUniqueSku(body.sku, id));
  }
  await Promise.all(checks);

  const patch = { ...body, updated_at: db.fn.now() };

  for (const field of ["model", "color", "description"]) {
    if (patch[field] !== undefined) patch[field] = emptyToNull(patch[field]);
  }

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
