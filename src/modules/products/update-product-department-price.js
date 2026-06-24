const upsertProductDepartmentPrices = require("./upsert-product-department-prices");

const updateProductDepartmentPrice = async ({ id, departmentId }, body, actor) => {
  const result = await upsertProductDepartmentPrices(
    { id },
    [
      {
        department_id: departmentId,
        price_per_unit: body.price_per_unit,
        is_active: body.is_active,
      },
    ],
    actor,
  );

  const departmentPrice = result.department_prices.find(
    (price) => Number(price.department_id) === Number(departmentId),
  );

  return { department_price: departmentPrice };
};

module.exports = updateProductDepartmentPrice;
