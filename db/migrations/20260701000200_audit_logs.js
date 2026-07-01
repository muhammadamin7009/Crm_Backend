exports.up = async function (knex) {
  await knex.schema.createTable("audit_logs", (table) => {
    table.bigIncrements("id");
    table.integer("company_id").notNullable().references("id").inTable("companies").onDelete("CASCADE");
    table.integer("actor_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.string("action", 12).notNullable();
    table.string("entity_type", 80).notNullable();
    table.string("entity_id", 80).nullable();
    table.string("path", 300).notNullable();
    table.integer("status_code").notNullable();
    table.jsonb("details").nullable();
    table.string("ip", 100).nullable();
    table.text("user_agent").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "created_at"]);
    table.index(["company_id", "actor_user_id"]);
  });

  await knex.raw("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY");
  await knex.raw("ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY");
  await knex.raw(`
    CREATE POLICY tenant_isolation ON audit_logs
    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)
    WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)
  `);
  await knex.raw("GRANT SELECT, INSERT ON audit_logs TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO crm_tenant_user");
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("audit_logs");
};
