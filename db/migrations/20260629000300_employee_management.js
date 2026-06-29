exports.up = async function (knex) {
  await knex.schema.createTable("positions", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.integer("department_id").unsigned().nullable().references("id").inTable("departments").onDelete("SET NULL");
    table.text("description").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("employee_profiles", (table) => {
    table.increments("id");
    table.integer("user_id").unsigned().notNullable().unique().references("id").inTable("users").onDelete("RESTRICT");
    table.integer("position_id").unsigned().notNullable().references("id").inTable("positions").onDelete("RESTRICT");
    table.date("hired_at").notNullable().defaultTo(knex.fn.now());
    table.date("terminated_at").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.text("note").nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("employee_agreements", (table) => {
    table.increments("id");
    table.integer("employee_id").unsigned().notNullable().references("id").inTable("employee_profiles").onDelete("CASCADE");
    table.enu("payment_type", ["piece_rate", "fixed_salary", "daily_rate", "mixed", "commission"]).notNullable();
    table.decimal("fixed_amount", 14, 2).notNullable().defaultTo(0);
    table.decimal("daily_rate", 14, 2).notNullable().defaultTo(0);
    table.decimal("commission_percent", 7, 3).notNullable().defaultTo(0);
    table.enu("payment_period", ["weekly", "monthly"]).notNullable().defaultTo("weekly");
    table.date("effective_from").notNullable();
    table.date("effective_to").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.text("note").nullable();
    table.integer("created_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamps(true, true);
    table.index(["employee_id", "effective_from"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable("employee_agreements");
  await knex.schema.dropTable("employee_profiles");
  await knex.schema.dropTable("positions");
};
