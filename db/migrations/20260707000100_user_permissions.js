const { PERMISSIONS, ADMIN_DEFAULT_PERMISSIONS } = require("../../src/shared/auth/permissions");

exports.up = async function (knex) {
  await knex.schema.createTable("permission_catalog", (table) => {
    table.string("key", 80).primary();
    table.string("label", 160).notNullable();
    table.string("group", 80).notNullable();
    table.text("description").nullable();
    table.integer("sort_order").notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("user_permissions", (table) => {
    table.increments("id");
    table.integer("company_id").unsigned().notNullable().references("id").inTable("companies").onDelete("CASCADE");
    table.integer("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("permission_key", 80).notNullable().references("key").inTable("permission_catalog").onDelete("CASCADE");
    table.boolean("allowed").notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.unique(["company_id", "user_id", "permission_key"]);
    table.index(["company_id", "user_id"]);
  });

  await knex("permission_catalog").insert(
    PERMISSIONS.map((item, index) => ({
      key: item.key,
      label: item.label,
      group: item.group,
      description: item.description,
      sort_order: index + 1,
    })),
  );

  const admins = await knex("users")
    .where({ role: "admin", is_deleted: false })
    .select("id", "company_id");

  const rows = [];
  for (const admin of admins) {
    for (const permission of ADMIN_DEFAULT_PERMISSIONS) {
      rows.push({
        company_id: admin.company_id,
        user_id: admin.id,
        permission_key: permission,
        allowed: true,
      });
    }
  }

  if (rows.length) {
    await knex("user_permissions").insert(rows).onConflict(["company_id", "user_id", "permission_key"]).merge({ allowed: true });
  }

  await knex.raw(`ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE user_permissions FORCE ROW LEVEL SECURITY`);
  await knex.raw(
    `CREATE POLICY tenant_isolation ON user_permissions USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer) WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)`,
  );

  await knex.raw("GRANT SELECT ON TABLE permission_catalog TO crm_tenant_user");
  await knex.raw("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_permissions TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE user_permissions_id_seq TO crm_tenant_user");
};

exports.down = async function (knex) {
  await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON user_permissions`);
  await knex.raw(`ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY`);
  await knex.schema.dropTableIfExists("user_permissions");
  await knex.schema.dropTableIfExists("permission_catalog");
};
