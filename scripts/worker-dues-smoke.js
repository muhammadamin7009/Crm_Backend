const db = require("../src/db");
const listWorkerDues = require("../src/modules/worker-payments/list-worker-dues");
const getWorkerBalance = require("../src/modules/worker-payments/get-worker-balance");

const run = async () => {
  const company = await db.root("companies").where({ slug: "zerrshoes" }).first();

  await db.root.transaction(async (trx) => {
    await trx.raw("SET LOCAL ROLE crm_tenant_user");
    await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);
    const result = await db.runWithDatabase(trx, () => listWorkerDues());
    const invalid = result.worker_dues.some((worker) => worker.remaining <= 0);
    const manager = await trx("users").where({ role: "super_admin", is_deleted: false }).first();
    const breakdowns = await db.runWithDatabase(trx, () =>
      Promise.all(
        result.worker_dues.map((worker) =>
          getWorkerBalance({ worker_id: worker.worker_id }, manager),
        ),
      ),
    );
    const breakdownsMatch = breakdowns.every(({ balance }) =>
      balance.previous_remaining + balance.new_earnings === balance.remaining,
    );

    console.log(JSON.stringify({
      workers_with_due: result.worker_dues.length,
      dues: result.worker_dues.map((worker) => ({
        worker_id: worker.worker_id,
        name: `${worker.first_name} ${worker.last_name}`,
        remaining: worker.remaining,
      })),
      breakdowns: breakdowns.map(({ worker_id, balance }) => ({
        worker_id,
        previous_remaining: balance.previous_remaining,
        new_earnings: balance.new_earnings,
        remaining: balance.remaining,
      })),
      only_positive_balances: !invalid,
      breakdowns_match_remaining: breakdownsMatch,
    }, null, 2));

    if (invalid || !breakdownsMatch) process.exitCode = 1;
  });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.destroy());
