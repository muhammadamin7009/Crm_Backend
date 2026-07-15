const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const getProductRecipe = async (productId) => {
  const product = await db("products as p")
    .leftJoin("departments as d", "d.id", "p.completion_department_id")
    .where({ "p.id": Number(productId), "p.is_deleted": false })
    .select(
      "p.id",
      "p.name",
      "p.unit",
      "p.completion_department_id",
      "d.name as completion_department_name",
    )
    .first();
  if (!product) throw new NotFoundError("Mahsulot topilmadi");

  const [materials, rawMaterials, departments] = await Promise.all([
    db("product_materials as pm")
      .join("raw_materials as rm", "rm.id", "pm.raw_material_id")
      .where({ "pm.product_id": product.id, "rm.is_deleted": false })
      .select(
        "pm.id",
        "pm.raw_material_id",
        "rm.name as raw_material_name",
        "rm.unit",
        "pm.quantity_per_pair",
      )
      .orderBy("rm.name"),
    db("raw_materials").where({ is_deleted: false }).select("id", "name", "unit").orderBy("name"),
    db("departments")
      .where({ is_deleted: false, is_active: true })
      .select("id", "name", "code")
      .orderBy("sort_order")
      .orderBy("name"),
  ]);

  return {
    recipe: {
      ...product,
      unit: "par",
      materials: materials.map((row) => ({
        ...row,
        quantity_per_pair: Number(row.quantity_per_pair),
      })),
    },
    raw_materials: rawMaterials,
    departments,
  };
};

const updateProductRecipe = async (productId, body, actor) => {
  const id = Number(productId);
  const departmentId = body.completion_department_id ? Number(body.completion_department_id) : null;
  const items = body.items || [];

  if (departmentId && !items.length) {
    throw new BadRequestError("Yakunlovchi bo'lim tanlansa, kamida bitta homashyo kiriting");
  }
  if (!departmentId && items.length) {
    throw new BadRequestError("Retsept uchun yakunlovchi bo'limni tanlang");
  }

  await db.transaction(async (trx) => {
    const product = await trx("products").where({ id, is_deleted: false }).forUpdate().first("id");
    if (!product) throw new NotFoundError("Mahsulot topilmadi");

    if (departmentId) {
      const department = await trx("departments")
        .where({ id: departmentId, is_deleted: false, is_active: true })
        .first("id");
      if (!department) throw new BadRequestError("Yakunlovchi bo'lim topilmadi yoki nofaol");

      const materialIds = items.map((item) => Number(item.raw_material_id));
      const found = await trx("raw_materials")
        .where({ is_deleted: false })
        .whereIn("id", materialIds)
        .count({ count: "id" })
        .first();
      if (Number(found.count) !== materialIds.length) {
        throw new BadRequestError("Retseptdagi homashyolardan biri topilmadi");
      }
    }

    await trx("product_materials").where({ product_id: id }).delete();
    if (items.length) {
      await trx("product_materials").insert(
        items.map((item) => ({
          product_id: id,
          raw_material_id: Number(item.raw_material_id),
          quantity_per_pair: Number(item.quantity_per_pair),
          created_by: actor.id,
        })),
      );
    }
    await trx("products").where({ id }).update({
      completion_department_id: departmentId,
      unit: "par",
      updated_at: trx.fn.now(),
    });
  });

  return getProductRecipe(id);
};

module.exports = { getProductRecipe, updateProductRecipe };
