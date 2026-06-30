const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const MANAGER_ROLES = ["super_admin", "admin"];

const showProduct = async ({ id }, actor) => {
  const product = await db("products as p")
    .leftJoin("categories as c", "c.id", "p.category_id")
    .where({ "p.id": id, "p.is_deleted": false })
    .select(
      "p.id",
      "p.category_id",
      "c.name as category_name",
      "p.name",
      "p.model",
      "p.sku",
      "p.color",
      "p.unit",
      "p.description",
      "p.purchase_price",
      "p.sale_price",
      "p.is_active",
      "p.created_by",
      "p.created_at",
      "p.updated_at",
    )
    .first();

  if (!product) throw new NotFoundError("Mahsulot topilmadi");

  const images = await db("product_images")
    .where({ product_id: id })
    .select("id", "image_url", "is_primary", "created_at")
    .orderBy("is_primary", "desc")
    .orderBy("id", "asc");

  const canSeeDepartmentPrices = MANAGER_ROLES.includes(actor?.role);

  if (!canSeeDepartmentPrices) {
    const { purchase_price, ...publicProduct } = product;
    return { product: { ...publicProduct, images } };
  }

  const departmentPrices = await db("departments as d")
    .leftJoin("product_department_prices as pdp", function () {
      this.on("pdp.department_id", "d.id").andOn("pdp.product_id", db.raw("?", [id]));
    })
    .where({ "d.is_deleted": false })
    .select(
      "d.id as department_id",
      "d.name as department_name",
      "d.code as department_code",
      "d.sort_order",
      "pdp.id",
      db.raw("COALESCE(pdp.price_per_unit, 0) as price_per_unit"),
      db.raw("COALESCE(pdp.is_active, true) as is_active"),
      "pdp.created_at",
      "pdp.updated_at",
    )
    .orderBy("d.sort_order", "asc")
    .orderBy("d.id", "asc");

  return { product: { ...product, images, department_prices: departmentPrices } };
};

module.exports = showProduct;
