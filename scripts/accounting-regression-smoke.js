const db = require("../src/db");
const removeUser = require("../src/modules/users/delete-user");
const { assertPaymentDoesNotExceedDebt } = require("../src/modules/client-payments/helpers");

const ROLLBACK = "ACCOUNTING_REGRESSION_ROLLBACK";

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();
  const [worker, client, product, department, manager] = await Promise.all([
    db.root("users").where({ company_id: company.id, role: "worker", is_deleted: false }).first(),
    db.root("users").where({ company_id: company.id, role: "client", is_deleted: false }).first(),
    db.root("products").where({ company_id: company.id, is_deleted: false }).first(),
    db.root("departments").where({ company_id: company.id, is_deleted: false }).first(),
    db.root("users").where({ company_id: company.id, role: "super_admin", is_deleted: false }).first(),
  ]);
  let result = {};
  try {
    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
      await db.runWithDatabase(trx, async () => {
        await trx("worker_outputs").insert({ worker_id: worker.id, product_id: product.id, department_id: department.id, quantity: 1, price_per_unit: 100, total_amount: 100, worked_at: trx.fn.now(), created_by: manager.id, is_deleted: false });
        await trx("worker_payments").insert({ worker_id: worker.id, amount: 30, advance_deduction: 60, other_deduction: 10, payment_type: "salary", paid_at: trx.fn.now(), created_by: manager.id, is_deleted: false });
        const removed = await removeUser({ id: worker.id });
        result.worker_delete_after_full_settlement = Boolean(removed.deleted_user);

        const [sale] = await trx("client_sales").insert({ client_id: client.id, product_id: product.id, quantity: 1, unit_price: 100, total_amount: 100, paid_amount: 0, debt_amount: 100, sold_at: trx.fn.now(), created_by: manager.id, is_deleted: false }).returning("id");
        await trx("client_returns").insert({ client_sale_id: sale.id, client_id: client.id, product_id: product.id, quantity: 0.4, amount: 40, returned_at: trx.fn.now(), created_by: manager.id, is_deleted: false });
        await assertPaymentDoesNotExceedDebt({ clientId: client.id, saleId: sale.id, amount: 60 });
        let overpaymentBlocked = false;
        try { await assertPaymentDoesNotExceedDebt({ clientId: client.id, saleId: sale.id, amount: 61 }); } catch { overpaymentBlocked = true; }
        result.return_adjusted_debt_enforced = overpaymentBlocked;
      });
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }
  result.rolled_back = true;
  console.log(JSON.stringify(result, null, 2));
  if (!result.worker_delete_after_full_settlement || !result.return_adjusted_debt_enforced) process.exitCode = 1;
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.destroy());
