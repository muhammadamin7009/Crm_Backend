require("dotenv/config");
const crypto = require("crypto");
const db = require("../src/db");
const {
  syncCashTransaction,
  removeCashTransaction,
} = require("../src/shared/finance/cash-ledger");
const finance = require("../src/modules/finance/_services");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  let rolledBack = false;
  const marker = `smoke-${crypto.randomUUID()}`;

  await db.root
    .transaction(async (trx) => {
      const company = await trx("companies").where({ status: "active" }).orderBy("id").first();
      if (!company) throw new Error("Smoke-test uchun faol korxona topilmadi");

      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);

      await db.runWithDatabase(trx, async () => {
        const [account] = await trx("financial_accounts")
          .insert({ name: marker, account_type: "cash", opening_balance: 1000 })
          .returning("*");

        await syncCashTransaction(trx, {
          sourceType: marker,
          sourceId: 1,
          transactionType: "income",
          amount: 500,
          accountId: account.id,
          description: "Smoke income",
        });
        await syncCashTransaction(trx, {
          sourceType: marker,
          sourceId: 1,
          transactionType: "income",
          amount: 700,
          accountId: account.id,
          description: "Smoke income update",
        });

        const active = await trx("cash_transactions")
          .where({ source_type: marker, source_id: 1, is_deleted: false })
          .select("amount");
        assert(active.length === 1, "Bitta manba uchun bir nechta faol tranzaksiya yaratildi");
        assert(Number(active[0].amount) === 700, "Tranzaksiya summasi yangilanmadi");

        await removeCashTransaction(trx, marker, 1);
        const remaining = await trx("cash_transactions")
          .where({ source_type: marker, source_id: 1, is_deleted: false })
          .count({ count: "id" })
          .first();
        assert(Number(remaining.count) === 0, "Bekor qilingan tranzaksiya faol qolib ketdi");

        const { report } = await finance.profitLoss({});
        assert(Number.isFinite(Number(report.operational_result)), "Operatsion natija hisoblanmadi");
        assert(
          report.accounting_basis === "accrual_weighted_average",
          "Hisobotning hisoblash usuli qaytmadi",
        );
      });

      throw new Error("__ROLLBACK_SMOKE__");
    })
    .catch((error) => {
      if (error.message !== "__ROLLBACK_SMOKE__") throw error;
      rolledBack = true;
    });

  console.log(JSON.stringify({ passed: true, rolled_back: rolledBack }, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.root.destroy());
