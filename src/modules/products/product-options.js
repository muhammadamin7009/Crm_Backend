const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { cleanText, canonicalizeProductOption, generateUniqueSku } = require("./helpers");

const OPTION_FIELDS = new Set(["model", "color"]);

const assertField = (type) => {
  if (!OPTION_FIELDS.has(type)) throw new BadRequestError("Noto'g'ri mahsulot xususiyati");
  return type;
};

const listProductOptions = async () => {
  const loadDistinct = async (field) => {
    const rows = await db("products")
      .distinct(field)
      .where({ is_deleted: false })
      .whereNotNull(field)
      .whereRaw("BTRIM(??) <> ''", [field])
      .orderBy(field, "asc");

    const seen = new Set();
    return rows
      .map((row) => cleanText(row[field]))
      .filter((value) => {
        const key = value?.toLocaleLowerCase("uz-UZ");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const [models, colors] = await Promise.all([loadDistinct("model"), loadDistinct("color")]);
  return { models, colors };
};

const updateProductOption = async (type, currentValue, newValue) => {
  const field = assertField(type);
  const current = cleanText(currentValue);
  const canonical = await canonicalizeProductOption(field, newValue);

  const products = await db("products")
    .select("id", "name", "color")
    .where({ is_deleted: false })
    .whereRaw("LOWER(BTRIM(??)) = LOWER(?)", [field, current]);

  for (const product of products) {
    const patch = { [field]: canonical, updated_at: db.fn.now() };
    if (field === "color") {
      patch.sku = await generateUniqueSku(product.name, canonical, product.id);
    }
    await db("products").where({ id: product.id }).update(patch);
  }

  return { updated_count: products.length, value: canonical };
};

const deleteProductOption = async (type, value) => {
  const field = assertField(type);
  const cleaned = cleanText(value);

  const products = await db("products")
    .select("id", "name")
    .where({ is_deleted: false })
    .whereRaw("LOWER(BTRIM(??)) = LOWER(?)", [field, cleaned]);

  for (const product of products) {
    const patch = { [field]: null, updated_at: db.fn.now() };
    if (field === "color") {
      patch.sku = await generateUniqueSku(product.name, null, product.id);
    }
    await db("products").where({ id: product.id }).update(patch);
  }

  return { updated_count: products.length };
};

module.exports = { listProductOptions, updateProductOption, deleteProductOption };
