const db = require("../src/db");

const ROLLBACK = "TENANT_SMOKE_ROLLBACK";

const run = async () => {
  const zerr = await db.root("companies").where({ slug: "zerrshoes" }).first();
  const existingUser = await db.root("users").where({ company_id: zerr.id, is_deleted: false }).orderBy("id").first();
  let result;

  try {
    await db.root.transaction(async (trx) => {
      const [perfect] = await trx("companies").insert({ name: "Perfect Shoes Smoke", slug: "perfectshoes-smoke" }).returning("*");
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(perfect.id)]);
      await trx("users").insert({ first_name: "Test", last_name: "User", username: existingUser.username, password: existingUser.password, role: "super_admin", is_deleted: false });

      const perfectUsers = await trx("users").count({ count: "*" }).first();
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(zerr.id)]);
      const zerrUsers = await trx("users").count({ count: "*" }).first();
      const sameUsername = await trx("users").where({ username: existingUser.username }).count({ count: "*" }).first();
      result = { duplicate_username_allowed: true, perfect_visible_users: Number(perfectUsers.count), zerr_visible_users: Number(zerrUsers.count), zerr_same_username_count: Number(sameUsername.count) };
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error.message !== ROLLBACK) throw error;
  }

  result.rolled_back = !(await db.root("companies").where({ slug: "perfectshoes-smoke" }).first());
  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.destroy());
