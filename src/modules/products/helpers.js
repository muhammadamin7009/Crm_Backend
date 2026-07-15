const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const ensureCategory = async (categoryId) => {
  if (categoryId === undefined || categoryId === null) return;

  const category = await db("categories")
    .where({ id: categoryId, is_deleted: false, is_active: true })
    .first();

  if (!category) {
    throw new BadRequestError("Faol kategoriya topilmadi");
  }
};

const getExistingProduct = async (id) => {
  const product = await db("products").where({ id, is_deleted: false }).first();

  if (!product) throw new NotFoundError("Mahsulot topilmadi");

  return product;
};

const ensureUniqueSku = async (sku, ignoredId) => {
  const query = db("products").whereRaw("LOWER(sku) = LOWER(?)", [sku]);

  if (ignoredId) query.whereNot({ id: ignoredId });

  const duplicate = await query.first();

  if (duplicate) throw new BadRequestError("Bu SKU mavjud");
};

const emptyToNull = (value) => (value === "" ? null : value);

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  return cleaned || null;
};

const resolveCategory = async ({ category_id, category_name }, actor, database = db) => {
  const name = cleanText(category_name);

  if (name) {
    let category = await database("categories")
      .whereRaw("LOWER(BTRIM(name)) = LOWER(?)", [name])
      .where({ is_deleted: false })
      .first();

    if (category) {
      if (!category.is_active) {
        [category] = await database("categories")
          .where({ id: category.id })
          .update({ is_active: true, updated_at: database.fn.now() })
          .returning(["id", "name", "is_active"]);
      }
      return category.id;
    }

    [category] = await database("categories")
      .insert({
        name,
        description: null,
        is_active: true,
        is_deleted: false,
        created_by: actor.id,
      })
      .returning(["id", "name", "is_active"]);

    return category.id;
  }

  await ensureCategory(category_id);
  return category_id || null;
};

const canonicalizeProductOption = async (field, value, database = db) => {
  const cleaned = cleanText(value);
  if (!cleaned) return null;

  const existing = await database("products")
    .select(field)
    .where({ is_deleted: false })
    .whereNotNull(field)
    .whereRaw("LOWER(BTRIM(??)) = LOWER(?)", [field, cleaned])
    .first();

  return cleanText(existing?.[field]) || cleaned;
};

const skuPart = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[ʻʼ‘’`']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const generateUniqueSku = async (name, color, ignoredId, database = db) => {
  const base = [skuPart(name), skuPart(color)].filter(Boolean).join("-").slice(0, 90) || "MAHSULOT";
  let sku = base;
  let suffix = 2;

  while (true) {
    const query = database("products").whereRaw("LOWER(sku) = LOWER(?)", [sku]);
    if (ignoredId) query.whereNot({ id: ignoredId });

    const duplicate = await query.first("id");
    if (!duplicate) return sku;

    const ending = `-${suffix}`;
    sku = `${base.slice(0, 100 - ending.length)}${ending}`;
    suffix += 1;
  }
};

module.exports = {
  ensureCategory,
  getExistingProduct,
  ensureUniqueSku,
  emptyToNull,
  cleanText,
  resolveCategory,
  canonicalizeProductOption,
  generateUniqueSku,
};
