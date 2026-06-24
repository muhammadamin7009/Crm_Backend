const db = require("../../db");
const { getExistingProduct } = require("./helpers");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const getDepartmentsByIds = async (departmentIds) => {
  const departments = await db("departments")
    .whereIn("id", departmentIds)
    .where({ is_deleted: false })
    .select("id");

  return new Set(departments.map((department) => Number(department.id)));
};

const upsertProductDepartmentPrices = async ({ id }, prices, actor) => {
  await getExistingProduct(id);

  const departmentIds = prices.map((price) => Number(price.department_id));
  const uniqueIds = new Set(departmentIds);

  if (uniqueIds.size !== departmentIds.length) {
    throw new BadRequestError("Bir bo'lim narxi bir martadan ko'p yuborilmasin");
  }

  const existingDepartments = await getDepartmentsByIds(departmentIds);
  const missingDepartment = departmentIds.find(
    (departmentId) => !existingDepartments.has(departmentId),
  );

  if (missingDepartment) throw new NotFoundError("Bo'lim topilmadi");

  if (!prices.length) return { department_prices: [] };

  const rows = prices.map((price) => ({
    product_id: id,
    department_id: Number(price.department_id),
    price_per_unit: price.price_per_unit,
    is_active: price.is_active ?? true,
    created_by: actor.id,
    updated_at: db.fn.now(),
  }));

  await db("product_department_prices")
    .insert(rows)
    .onConflict(["product_id", "department_id"])
    .merge(["price_per_unit", "is_active", "updated_at"]);

  const listProductDepartmentPrices = require("./list-product-department-prices");
  return listProductDepartmentPrices({ id });
};

module.exports = upsertProductDepartmentPrices;
