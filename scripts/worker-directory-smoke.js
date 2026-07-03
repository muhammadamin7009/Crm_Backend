const db = require("../src/db");
const listUsers = require("../src/modules/users/list-users");

const run = async () => {
  const worker = await db.root("users").where({ role: "worker", is_deleted: false }).first();
  if (!worker) return console.log(JSON.stringify({ skipped: true, reason: "worker topilmadi" }));
  await db.root.transaction(async (trx) => {
    await trx.raw("SET LOCAL ROLE crm_tenant_user");
    await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [
      String(worker.company_id),
    ]);
    const result = await db.runWithDatabase(trx, () =>
      listUsers(
        { limit: 100, offset: 0 },
        { id: worker.id, role: "worker", company_id: worker.company_id },
      ),
    );
    const roles = [...new Set(result.users.map((user) => user.role))];
    const leaksPrivateFields = result.users.some(
      (user) => "username" in user || "phone" in user || "created_by" in user,
    );
    console.log(
      JSON.stringify(
        { visible_users: result.users.length, roles, private_fields_hidden: !leaksPrivateFields },
        null,
        2,
      ),
    );
  });
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
