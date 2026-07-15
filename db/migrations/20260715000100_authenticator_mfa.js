exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.text("totp_secret_encrypted").nullable();
    table.boolean("totp_enabled").notNullable().defaultTo(false);
    table.bigInteger("totp_last_counter").nullable();
    table.timestamp("totp_confirmed_at", { useTz: true }).nullable();
  });

  await knex.schema.alterTable("auth_challenges", (table) => {
    table.string("method", 20).notNullable().defaultTo("sms");
  });

  await knex.schema.createTable("user_recovery_codes", (table) => {
    table.bigIncrements("id");
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("code_hash", 350).notNullable();
    table.timestamp("used_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "user_id", "used_at"]);
  });

  await knex.raw("ALTER TABLE user_recovery_codes ENABLE ROW LEVEL SECURITY");
  await knex.raw("ALTER TABLE user_recovery_codes FORCE ROW LEVEL SECURITY");
  await knex.raw(`
    CREATE POLICY tenant_isolation ON user_recovery_codes
    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)
    WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)
  `);
  await knex.raw(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_recovery_codes TO crm_tenant_user",
  );
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE user_recovery_codes_id_seq TO crm_tenant_user");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_recovery_codes");
  await knex.schema.alterTable("auth_challenges", (table) => table.dropColumn("method"));
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("totp_confirmed_at");
    table.dropColumn("totp_last_counter");
    table.dropColumn("totp_enabled");
    table.dropColumn("totp_secret_encrypted");
  });
};
