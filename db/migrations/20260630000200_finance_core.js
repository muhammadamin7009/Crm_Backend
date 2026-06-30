exports.up = async function (knex) {
  await knex.schema.createTable("payroll_periods", (table) => {
    table.increments("id");
    table.date("period_from").notNullable();
    table.date("period_to").notNullable();
    table.date("payment_date").notNullable();
    table.enu("status", ["open", "closed"]).notNullable().defaultTo("open");
    table.text("note").nullable();
    table.integer("created_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.integer("closed_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("closed_at").nullable();
    table.timestamps(true, true);
    table.unique(["period_from", "period_to"]);
  });

  await knex.schema.createTable("payroll_lines", (table) => {
    table.increments("id");
    table.integer("period_id").unsigned().notNullable().references("id").inTable("payroll_periods").onDelete("CASCADE");
    table.integer("employee_id").unsigned().notNullable().references("id").inTable("employee_profiles").onDelete("RESTRICT");
    table.decimal("piece_earnings", 14, 2).notNullable().defaultTo(0);
    table.decimal("fixed_earnings", 14, 2).notNullable().defaultTo(0);
    table.decimal("daily_earnings", 14, 2).notNullable().defaultTo(0);
    table.decimal("commission_earnings", 14, 2).notNullable().defaultTo(0);
    table.decimal("bonus", 14, 2).notNullable().defaultTo(0);
    table.decimal("advance_deduction", 14, 2).notNullable().defaultTo(0);
    table.decimal("other_deduction", 14, 2).notNullable().defaultTo(0);
    table.decimal("total_earned", 14, 2).notNullable().defaultTo(0);
    table.decimal("cash_amount", 14, 2).notNullable().defaultTo(0);
    table.text("note").nullable();
    table.timestamps(true, true);
    table.unique(["period_id", "employee_id"]);
  });

  await knex.schema.createTable("expense_categories", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.text("description").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("financial_accounts", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.enu("account_type", ["cash", "card", "bank"]).notNullable();
    table.decimal("opening_balance", 14, 2).notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("expenses", (table) => {
    table.increments("id");
    table.integer("category_id").unsigned().notNullable().references("id").inTable("expense_categories").onDelete("RESTRICT");
    table.integer("account_id").unsigned().nullable().references("id").inTable("financial_accounts").onDelete("SET NULL");
    table.string("title", 160).notNullable();
    table.decimal("amount", 14, 2).notNullable();
    table.date("spent_at").notNullable().defaultTo(knex.fn.now());
    table.text("note").nullable();
    table.integer("created_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["spent_at", "category_id"]);
  });

  await knex.schema.createTable("cash_transactions", (table) => {
    table.increments("id");
    table.integer("account_id").unsigned().notNullable().references("id").inTable("financial_accounts").onDelete("RESTRICT");
    table.enu("transaction_type", ["income", "expense"]).notNullable();
    table.string("source_type", 50).notNullable().defaultTo("manual");
    table.integer("source_id").nullable();
    table.decimal("amount", 14, 2).notNullable();
    table.date("transacted_at").notNullable().defaultTo(knex.fn.now());
    table.string("description", 250).nullable();
    table.integer("created_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["account_id", "transacted_at"]);
  });

  await knex.schema.createTable("client_returns", (table) => {
    table.increments("id");
    table.integer("client_sale_id").unsigned().notNullable().references("id").inTable("client_sales").onDelete("RESTRICT");
    table.integer("client_id").unsigned().notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.integer("product_id").unsigned().notNullable().references("id").inTable("products").onDelete("RESTRICT");
    table.decimal("quantity", 14, 2).notNullable();
    table.decimal("amount", 14, 2).notNullable();
    table.date("returned_at").notNullable().defaultTo(knex.fn.now());
    table.text("reason").nullable();
    table.integer("created_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["client_id", "returned_at"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable("client_returns");
  await knex.schema.dropTable("cash_transactions");
  await knex.schema.dropTable("expenses");
  await knex.schema.dropTable("financial_accounts");
  await knex.schema.dropTable("expense_categories");
  await knex.schema.dropTable("payroll_lines");
  await knex.schema.dropTable("payroll_periods");
};
