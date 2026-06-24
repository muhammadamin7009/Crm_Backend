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
  const product = await db("products")
    .where({ id, is_deleted: false })
    .first();

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

module.exports = {
  ensureCategory,
  getExistingProduct,
  ensureUniqueSku,
  emptyToNull,
};
