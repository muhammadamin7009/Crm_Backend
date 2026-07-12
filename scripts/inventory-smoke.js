const db = require("../src/db");
const inventory = require("../src/modules/inventory/_services");
const materialPurchases = require("../src/modules/material-purchases/_services");

const ROLLBACK = "INVENTORY_SMOKE_ROLLBACK";

const run = async () => {
  const requestedSlug = process.env.SMOKE_COMPANY_SLUG;
  const companyQuery = db
    .root("companies as c")
    .join("users as u", function joinAdmin() {
      this.on("u.company_id", "=", "c.id").andOnVal("u.role", "=", "super_admin");
    })
    .where("u.is_deleted", false)
    .whereRaw(
      "EXISTS (SELECT 1 FROM raw_materials rm WHERE rm.company_id = c.id AND rm.is_deleted = false)",
    )
    .select("c.*")
    .orderBy("c.id");
  if (requestedSlug) companyQuery.where("c.slug", requestedSlug);
  const company = await companyQuery.first();
  if (!company) throw new Error("Smoke uchun admin va ombor elementi bor korxona topilmadi");
  const actor = await db
    .root("users")
    .where({ company_id: company.id, role: "super_admin", is_deleted: false })
    .first("id");
  const item = await db
    .root("raw_materials")
    .where({ company_id: company.id, is_deleted: false })
    .first("id");
  if (!actor || !item) throw new Error("Smoke uchun admin yoki ombor elementi topilmadi");
  const itemType = "raw_material";

  let result;
  let createdCodes = [];
  try {
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);

      await db.runWithDatabase(trx, async () => {
        const suffix = Date.now();
        createdCodes = [`SMOKE_A_${suffix}`, `SMOKE_B_${suffix}`];
        const first = await inventory.createWarehouse(
          { name: "Smoke A", code: `SMOKE_A_${suffix}`, location: null },
          actor,
        );
        const second = await inventory.createWarehouse(
          { name: "Smoke B", code: `SMOKE_B_${suffix}`, location: null },
          actor,
        );
        await inventory.createMovement(
          {
            warehouse_id: first.warehouse.id,
            item_type: itemType,
            item_id: item.id,
            movement_type: "opening",
            quantity: 10,
            idempotency_key: `inventory-smoke-opening-${suffix}`,
          },
          actor,
        );
        const replay = await inventory.createMovement(
          {
            warehouse_id: first.warehouse.id,
            item_type: itemType,
            item_id: item.id,
            movement_type: "opening",
            quantity: 10,
            idempotency_key: `inventory-smoke-opening-${suffix}`,
          },
          actor,
        );
        await inventory.createTransfer(
          {
            from_warehouse_id: first.warehouse.id,
            to_warehouse_id: second.warehouse.id,
            item_type: itemType,
            item_id: item.id,
            quantity: 3,
            idempotency_key: `inventory-smoke-transfer-${suffix}`,
          },
          actor,
        );

        const balances = await trx("inventory_balances")
          .where({ item_type: itemType, item_id: item.id })
          .whereIn("warehouse_id", [first.warehouse.id, second.warehouse.id])
          .orderBy("warehouse_id");
        const [stockReport, movementReport, itemDirectory] = await Promise.all([
          inventory.listStock({ warehouse_id: first.warehouse.id }),
          inventory.listMovements({ warehouse_id: first.warehouse.id }),
          inventory.listItems({ item_type: itemType }),
        ]);
        let negativeBlocked = false;
        try {
          await inventory.createMovement(
            {
              warehouse_id: first.warehouse.id,
              item_type: itemType,
              item_id: item.id,
              movement_type: "out",
              quantity: 100,
            },
            actor,
          );
        } catch (error) {
          negativeBlocked = /yetarli qoldiq/i.test(error.message);
        }

        const defaultWarehouse = await trx("warehouses")
          .where({ is_default: true, is_active: true })
          .first("id");
        let supplier = await trx("suppliers").where({ is_deleted: false }).first("id");
        if (!supplier) {
          [supplier] = await trx("suppliers")
            .insert({ name: `Inventory smoke ${suffix}`, is_deleted: false })
            .returning("id");
        }
        const beforePurchase = await trx("inventory_balances")
          .where({
            warehouse_id: defaultWarehouse.id,
            item_type: "raw_material",
            item_id: item.id,
          })
          .first("quantity");
        const initialQuantity = Number(beforePurchase?.quantity || 0);
        const createdPurchase = await materialPurchases.createPurchase(
          {
            supplier_id: supplier.id,
            paid_amount: 0,
            note: "Inventory purchase smoke",
            items: [{ raw_material_id: item.id, quantity: 10, unit_price: 2 }],
          },
          actor,
        );
        const purchaseId = createdPurchase.material_purchase.id;
        const afterCreate = await trx("inventory_balances")
          .where({
            warehouse_id: defaultWarehouse.id,
            item_type: "raw_material",
            item_id: item.id,
          })
          .first("quantity");
        await materialPurchases.updatePurchase(
          { items: [{ raw_material_id: item.id, quantity: 15, unit_price: 2 }] },
          purchaseId,
          actor,
        );
        const afterUpdate = await trx("inventory_balances")
          .where({
            warehouse_id: defaultWarehouse.id,
            item_type: "raw_material",
            item_id: item.id,
          })
          .first("quantity");
        await materialPurchases.deletePurchase(purchaseId, actor);
        const afterDelete = await trx("inventory_balances")
          .where({
            warehouse_id: defaultWarehouse.id,
            item_type: "raw_material",
            item_id: item.id,
          })
          .first("quantity");

        result = {
          source_quantity: Number(balances[0].quantity),
          destination_quantity: Number(balances[1].quantity),
          negative_stock_blocked: negativeBlocked,
          idempotency_replay: replay.idempotent_replay === true,
          stock_report_rows: stockReport.stock.length,
          movement_report_rows: movementReport.inventory_movements.length,
          item_directory_rows: itemDirectory.items.length,
          purchase_create_delta: Number(afterCreate.quantity) - initialQuantity,
          purchase_update_delta: Number(afterUpdate.quantity) - initialQuantity,
          purchase_delete_delta: Number(afterDelete.quantity) - initialQuantity,
        };
        result.passed =
          result.source_quantity === 7 &&
          result.destination_quantity === 3 &&
          result.negative_stock_blocked &&
          result.idempotency_replay &&
          result.stock_report_rows === 1 &&
          result.movement_report_rows === 2 &&
          result.item_directory_rows > 0 &&
          result.purchase_create_delta === 10 &&
          result.purchase_update_delta === 15 &&
          result.purchase_delete_delta === 0;
      });
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }

  const remaining = await db.root("warehouses").whereIn("code", createdCodes).count({ count: "id" }).first();
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
