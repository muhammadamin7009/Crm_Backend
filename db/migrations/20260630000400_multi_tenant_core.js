const TENANT_TABLES = [
  "users", "categories", "products", "product_images", "departments",
  "product_department_prices", "worker_outputs", "worker_payments",
  "worker_advances", "client_sales", "client_payments", "client_returns",
  "suppliers", "raw_materials", "material_purchases",
  "material_purchase_items", "supplier_payments", "positions",
  "employee_profiles", "employee_agreements", "payroll_periods",
  "payroll_lines", "expense_categories", "financial_accounts", "expenses",
  "cash_transactions",
];

const UNIQUE_CONSTRAINTS = [
  ["users", "users_username_unique", ["company_id", "username"]],
  ["users", "users_phone_unique", ["company_id", "phone"]],
  ["categories", "categories_name_unique", ["company_id", "name"]],
  ["products", "products_sku_unique", ["company_id", "sku"]],
  ["departments", "departments_name_unique", ["company_id", "name"]],
  ["departments", "departments_code_unique", ["company_id", "code"]],
  ["raw_materials", "raw_materials_name_unit_unique", ["company_id", "name", "unit"]],
  ["positions", "positions_name_unique", ["company_id", "name"]],
  ["employee_profiles", "employee_profiles_user_id_unique", ["company_id", "user_id"]],
  ["payroll_periods", "payroll_periods_period_from_period_to_unique", ["company_id", "period_from", "period_to"]],
  ["expense_categories", "expense_categories_name_unique", ["company_id", "name"]],
  ["financial_accounts", "financial_accounts_name_unique", ["company_id", "name"]],
];

exports.up = async function (knex) {
  await knex.schema.createTable("companies", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("slug", 80).notNullable().unique();
    table.string("logo_url", 500).nullable();
    table.string("phone", 30).nullable();
    table.enu("status", ["active", "suspended", "archived"]).notNullable().defaultTo("active");
    table.timestamps(true, true);
  });

  const [company] = await knex("companies")
    .insert({ name: "Zerr Shoes", slug: "zerrshoes", status: "active" })
    .returning("id");
  const companyId = company.id || company;

  await knex.schema.createTable("subscription_plans", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.decimal("monthly_price", 14, 2).notNullable().defaultTo(0);
    table.integer("max_users").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
  await knex.schema.createTable("company_subscriptions", (table) => {
    table.increments("id");
    table.integer("company_id").unsigned().notNullable().unique().references("id").inTable("companies").onDelete("CASCADE");
    table.integer("plan_id").unsigned().nullable().references("id").inTable("subscription_plans").onDelete("SET NULL");
    table.date("starts_at").notNullable().defaultTo(knex.fn.now());
    table.date("ends_at").nullable();
    table.enu("status", ["trial", "active", "overdue", "suspended"]).notNullable().defaultTo("trial");
    table.timestamps(true, true);
  });
  await knex.schema.createTable("subscription_payments", (table) => {
    table.increments("id");
    table.integer("company_id").unsigned().notNullable().references("id").inTable("companies").onDelete("CASCADE");
    table.decimal("amount", 14, 2).notNullable();
    table.date("paid_at").notNullable().defaultTo(knex.fn.now());
    table.date("period_from").nullable();
    table.date("period_to").nullable();
    table.text("note").nullable();
    table.timestamps(true, true);
    table.index(["company_id", "paid_at"]);
  });
  await knex("company_subscriptions").insert({ company_id: companyId, status: "active" });

  for (const tableName of TENANT_TABLES) {
    await knex.schema.alterTable(tableName, (table) => {
      table.integer("company_id").unsigned().nullable().references("id").inTable("companies").onDelete("RESTRICT");
    });
    await knex(tableName).update({ company_id: companyId });
    await knex.schema.alterTable(tableName, (table) => {
      table.integer("company_id").unsigned().notNullable().alter();
    });
    await knex.raw(`ALTER TABLE ?? ALTER COLUMN company_id SET DEFAULT (NULLIF(current_setting('app.current_company_id', true), '')::integer)`, [tableName]);
    await knex.raw(`CREATE INDEX ?? ON ?? (company_id)`, [`${tableName}_company_id_index`, tableName]);
  }

  for (const [tableName, oldName, columns] of UNIQUE_CONSTRAINTS) {
    await knex.raw("ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??", [tableName, oldName]);
    await knex.schema.alterTable(tableName, (table) => table.unique(columns));
  }

  await knex.raw(`CREATE UNIQUE INDEX users_one_super_admin_per_company ON users (company_id) WHERE role = 'super_admin' AND is_deleted = false`);

  for (const tableName of TENANT_TABLES) {
    await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [tableName]);
    await knex.raw(`ALTER TABLE ?? FORCE ROW LEVEL SECURITY`, [tableName]);
    await knex.raw(
      `CREATE POLICY tenant_isolation ON ?? USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer) WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::integer)`,
      [tableName],
    );
  }
};

exports.down = async function (knex) {
  for (const tableName of TENANT_TABLES) {
    await knex.raw(`DROP POLICY IF EXISTS tenant_isolation ON ??`, [tableName]);
    await knex.raw(`ALTER TABLE ?? DISABLE ROW LEVEL SECURITY`, [tableName]);
  }
  await knex.raw("DROP INDEX IF EXISTS users_one_super_admin_per_company");
  for (const tableName of [...TENANT_TABLES].reverse()) {
    await knex.schema.alterTable(tableName, (table) => table.dropColumn("company_id"));
  }
  await knex.schema.dropTable("subscription_payments");
  await knex.schema.dropTable("company_subscriptions");
  await knex.schema.dropTable("subscription_plans");
  await knex.schema.dropTable("companies");
};
