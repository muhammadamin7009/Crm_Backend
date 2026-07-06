exports.up = async function (knex) {
  await knex.schema.createTable("auth_challenges", (table) => {
    table.uuid("id").primary();
    table.integer("company_id").notNullable().references("id").inTable("companies").onDelete("CASCADE");
    table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("code_hash", 350).notNullable();
    table.string("device_id", 100).notNullable();
    table.text("user_agent").nullable();
    table.string("ip_address", 100).nullable();
    table.integer("attempts").notNullable().defaultTo(0);
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("consumed_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "user_id", "expires_at"]);
  });

  await knex.schema.createTable("user_sessions", (table) => {
    table.uuid("id").primary();
    table.uuid("token_jti").notNullable().unique();
    table.integer("company_id").notNullable().references("id").inTable("companies").onDelete("CASCADE");
    table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("device_id", 100).notNullable();
    table.string("device_name", 160).nullable();
    table.text("user_agent").nullable();
    table.string("ip_address", 100).nullable();
    table.timestamp("last_used_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "user_id", "revoked_at"]);
  });

  for (const tableName of ["auth_challenges", "user_sessions"]) {
    await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [tableName]);
    await knex.raw(`ALTER TABLE ?? FORCE ROW LEVEL SECURITY`, [tableName]);
    await knex.raw(
      `CREATE POLICY tenant_isolation ON ?? USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer) WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)`,
      [tableName],
    );
    await knex.raw("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ?? TO crm_tenant_user", [tableName]);
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_sessions");
  await knex.schema.dropTableIfExists("auth_challenges");
};
