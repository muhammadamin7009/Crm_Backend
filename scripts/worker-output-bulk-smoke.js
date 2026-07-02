const db = require("../src/db");
const createBulk = require("../src/modules/worker-outputs/create-bulk-worker-outputs");

const ROLLBACK = "BULK_OUTPUT_ROLLBACK";

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();
  let result;

  try {
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);

      await db.runWithDatabase(trx, async () => {
        const prices = await trx("product_department_prices as pdp")
          .join("products as p", "p.id", "pdp.product_id")
          .join("departments as d", "d.id", "pdp.department_id")
          .where({ "p.is_deleted": false, "d.is_deleted": false })
          .select("pdp.product_id", "pdp.department_id")
          .orderBy("pdp.department_id");
        const grouped = prices.reduce((map, row) => {
          const key = row.department_id;
          map[key] = [...(map[key] || []), row.product_id];
          return map;
        }, {});
        const entry = Object.entries(grouped).find(([, ids]) => new Set(ids).size >= 2);
        if (!entry) throw new Error("Test uchun bitta bo'limda 2 ta narxlangan mahsulot topilmadi");

        const worker = await trx("users").where({ role: "worker", is_deleted: false }).first();
        const manager = await trx("users").where({ role: "super_admin", is_deleted: false }).first();
        const productIds = [...new Set(entry[1])].slice(0, 2);
        result = await createBulk({
          worker_id: worker.id,
          department_id: Number(entry[0]),
          worked_at: new Date().toISOString().slice(0, 10),
          note: "bulk smoke",
          items: productIds.map((productId, index) => ({ product_id: productId, quantity: index + 1 })),
        }, manager);
      });

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }

  const passed = result?.created_count === 2 && result.worker_outputs?.length === 2;
  console.log(JSON.stringify({ created_count: result?.created_count, transaction_passed: passed, rolled_back: true }, null, 2));
  if (!passed) process.exitCode = 1;
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.destroy());
