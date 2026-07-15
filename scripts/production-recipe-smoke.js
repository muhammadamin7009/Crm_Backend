const db = require("../src/db");
const inventory = require("../src/modules/inventory/_services");

const ROLLBACK = "PRODUCTION_RECIPE_SMOKE_ROLLBACK";

const run = async () => {
  const company = await db
    .root("companies as c")
    .whereRaw(
      "EXISTS (SELECT 1 FROM users u WHERE u.company_id = c.id AND u.role = 'super_admin' AND u.is_deleted = false)",
    )
    .whereRaw(
      "EXISTS (SELECT 1 FROM products p WHERE p.company_id = c.id AND p.is_deleted = false AND p.is_active = true)",
    )
    .whereRaw(
      "EXISTS (SELECT 1 FROM raw_materials rm WHERE rm.company_id = c.id AND rm.is_deleted = false)",
    )
    .whereRaw(
      "EXISTS (SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.is_deleted = false AND d.is_active = true)",
    )
    .orderBy("c.id")
    .first("c.id");
  if (!company) throw new Error("Retsept smoke testi uchun mos korxona topilmadi");

  const [actor, product, material, department] = await Promise.all([
    db
      .root("users")
      .where({ company_id: company.id, role: "super_admin", is_deleted: false })
      .first("id"),
    db
      .root("products")
      .where({ company_id: company.id, is_deleted: false, is_active: true })
      .first("id"),
    db.root("raw_materials").where({ company_id: company.id, is_deleted: false }).first("id"),
    db
      .root("departments")
      .where({ company_id: company.id, is_deleted: false, is_active: true })
      .first("id"),
  ]);

  let result;
  const idempotencyKey = `production-recipe-smoke-${Date.now()}`;
  try {
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);

      await db.runWithDatabase(trx, async () => {
        const productWarehouse = await trx("warehouses")
          .where({ is_active: true })
          .whereIn("warehouse_type", ["product", "mixed"])
          .orderByRaw("CASE WHEN warehouse_type = 'product' THEN 0 ELSE 1 END")
          .orderBy("is_default", "desc")
          .first("id");
        const rawWarehouse = await trx("warehouses")
          .where({ is_active: true })
          .whereIn("warehouse_type", ["raw_material", "mixed"])
          .orderByRaw("CASE WHEN warehouse_type = 'raw_material' THEN 0 ELSE 1 END")
          .orderBy("is_default", "desc")
          .first("id");
        if (!productWarehouse || !rawWarehouse) throw new Error("Test uchun faol ombor topilmadi");

        await trx("product_materials").where({ product_id: product.id }).delete();
        await trx("products").where({ id: product.id }).update({
          completion_department_id: department.id,
          unit: "par",
        });
        await trx("product_materials").insert({
          product_id: product.id,
          raw_material_id: material.id,
          quantity_per_pair: 2,
          created_by: actor.id,
        });

        await inventory.createMovement(
          {
            warehouse_id: rawWarehouse.id,
            item_type: "raw_material",
            item_id: material.id,
            movement_type: "in",
            quantity: 100,
            idempotency_key: idempotencyKey,
          },
          actor,
        );
        const rawBefore = await trx("inventory_balances")
          .where({
            warehouse_id: rawWarehouse.id,
            item_type: "raw_material",
            item_id: material.id,
          })
          .first("quantity");
        const productBefore = await trx("inventory_balances")
          .where({
            warehouse_id: productWarehouse.id,
            item_type: "product",
            item_id: product.id,
          })
          .first("quantity");
        const initialRaw = Number(rawBefore.quantity);
        const initialProduct = Number(productBefore?.quantity || 0);

        const [output] = await trx("worker_outputs")
          .insert({
            worker_id: actor.id,
            product_id: product.id,
            department_id: department.id,
            quantity: 5,
            price_per_unit: 0,
            total_amount: 0,
            worked_at: trx.fn.now(),
            created_by: actor.id,
            inventory_tracked_at: trx.fn.now(),
          })
          .returning("id");
        await inventory.syncProductionOutput(trx, output.id, actor);

        const afterCreateProduct = await trx("inventory_balances")
          .where({
            warehouse_id: productWarehouse.id,
            item_type: "product",
            item_id: product.id,
          })
          .first("quantity");
        const afterCreateRaw = await trx("inventory_balances")
          .where({
            warehouse_id: rawWarehouse.id,
            item_type: "raw_material",
            item_id: material.id,
          })
          .first("quantity");

        await trx("worker_outputs").where({ id: output.id }).update({ quantity: 3 });
        await inventory.syncProductionOutput(trx, output.id, actor);
        const afterUpdateProduct = await trx("inventory_balances")
          .where({
            warehouse_id: productWarehouse.id,
            item_type: "product",
            item_id: product.id,
          })
          .first("quantity");
        const afterUpdateRaw = await trx("inventory_balances")
          .where({
            warehouse_id: rawWarehouse.id,
            item_type: "raw_material",
            item_id: material.id,
          })
          .first("quantity");

        await trx("worker_outputs").where({ id: output.id }).update({ is_deleted: true });
        await inventory.syncProductionOutput(trx, output.id, actor);
        const afterDeleteProduct = await trx("inventory_balances")
          .where({
            warehouse_id: productWarehouse.id,
            item_type: "product",
            item_id: product.id,
          })
          .first("quantity");
        const afterDeleteRaw = await trx("inventory_balances")
          .where({
            warehouse_id: rawWarehouse.id,
            item_type: "raw_material",
            item_id: material.id,
          })
          .first("quantity");

        result = {
          create_product_delta: Number(afterCreateProduct.quantity) - initialProduct,
          create_raw_delta: Number(afterCreateRaw.quantity) - initialRaw,
          update_product_delta: Number(afterUpdateProduct.quantity) - initialProduct,
          update_raw_delta: Number(afterUpdateRaw.quantity) - initialRaw,
          delete_product_delta: Number(afterDeleteProduct.quantity) - initialProduct,
          delete_raw_delta: Number(afterDeleteRaw.quantity) - initialRaw,
        };
        result.passed =
          result.create_product_delta === 5 &&
          result.create_raw_delta === -10 &&
          result.update_product_delta === 3 &&
          result.update_raw_delta === -6 &&
          result.delete_product_delta === 0 &&
          result.delete_raw_delta === 0;
      });
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }

  const remaining = await db
    .root("inventory_movements")
    .where({ idempotency_key: idempotencyKey })
    .count({ count: "id" })
    .first();
  result.rolled_back = Number(remaining.count) === 0;
  result.passed = result.passed && result.rolled_back;
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
