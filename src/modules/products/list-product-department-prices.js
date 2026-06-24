const db = require("../../db");
const { getExistingProduct } = require("./helpers");

const listProductDepartmentPrices = async ({ id }) => {
  await getExistingProduct(id);

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

  return { department_prices: departmentPrices };
};

module.exports = listProductDepartmentPrices;
