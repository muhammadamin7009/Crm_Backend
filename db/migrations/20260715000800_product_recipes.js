const TENANT_SETTING = "NULLIF(current_setting('app.current_company_id', true), '')::integer";

const setTenant = (knex, companyId) =>
  knex.raw("SELECT set_config('app.current_company_id', ?, true)", [String(companyId)]);

exports.up = async function (knex) {
  await knex.schema.alterTable("products", (table) => {
    table
      .integer("completion_department_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("departments")
      .onDelete("SET NULL");
  });
  await knex.schema.alterTable("worker_outputs", (table) => {
    table.timestamp("inventory_tracked_at", { useTz: true }).nullable();
  });

  const companies = await knex("companies").select("id");
  for (const company of companies) {
    await setTenant(knex, company.id);
    await knex("products").where({ company_id: company.id, unit: "dona" }).update({ unit: "par" });
  }
  await knex.raw("SELECT set_config('app.current_company_id', '', true)");

  await knex.schema.alterTable("products", (table) => {
    table.string("unit", 20).notNullable().defaultTo("par").alter();
  });

  await knex.schema.createTable("product_materials", (table) => {
    table.bigIncrements("id");
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .defaultTo(knex.raw(TENANT_SETTING))
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");
    table
      .integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table
      .integer("raw_material_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("raw_materials")
      .onDelete("RESTRICT");
    table.decimal("quantity_per_pair", 16, 3).notNullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);
    table.unique(["company_id", "product_id", "raw_material_id"]);
    table.index(["company_id", "product_id"]);
  });
  await knex.raw(
    "ALTER TABLE product_materials ADD CONSTRAINT product_materials_quantity_check CHECK (quantity_per_pair > 0)",
  );
  await knex.raw("ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY");
  await knex.raw("ALTER TABLE product_materials FORCE ROW LEVEL SECURITY");
  await knex.raw(
    `CREATE POLICY tenant_isolation ON product_materials USING (company_id = ${TENANT_SETTING}) WITH CHECK (company_id = ${TENANT_SETTING})`,
  );
  await knex.raw(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_materials TO crm_tenant_user",
  );
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE product_materials_id_seq TO crm_tenant_user");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_materials");
  await knex.schema.alterTable("worker_outputs", (table) => {
    table.dropColumn("inventory_tracked_at");
  });
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("completion_department_id");
  });
};
