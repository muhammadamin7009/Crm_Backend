exports.up = async function (knex) {
  await knex.schema.createTable("suppliers", (table) => {
    table.increments("id");
    table.string("name", 120).notNullable();
    table.string("phone", 30).nullable();
    table.string("address", 255).nullable();
    table.decimal("opening_balance", 14, 2).notNullable().defaultTo(0);
    table.text("note").nullable();
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["name"]);
  });

  await knex.schema.createTable("raw_materials", (table) => {
    table.increments("id");
    table.string("name", 120).notNullable();
    table.string("unit", 30).notNullable().defaultTo("dona");
    table.text("note").nullable();
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.unique(["name", "unit"]);
  });

  await knex.schema.createTable("material_purchases", (table) => {
    table.increments("id");
    table
      .integer("supplier_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("RESTRICT");
    table.date("purchased_at").notNullable().defaultTo(knex.fn.now());
    table.decimal("subtotal", 14, 2).notNullable();
    table.decimal("paid_amount", 14, 2).notNullable().defaultTo(0);
    table.decimal("debt_amount", 14, 2).notNullable().defaultTo(0);
    table.text("note").nullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["supplier_id", "purchased_at"]);
  });

  await knex.schema.createTable("material_purchase_items", (table) => {
    table.increments("id");
    table
      .integer("purchase_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("material_purchases")
      .onDelete("CASCADE");
    table
      .integer("raw_material_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("raw_materials")
      .onDelete("RESTRICT");
    table.decimal("quantity", 14, 2).notNullable();
    table.decimal("unit_price", 14, 2).notNullable();
    table.decimal("total_amount", 14, 2).notNullable();
  });

  await knex.schema.createTable("supplier_payments", (table) => {
    table.increments("id");
    table
      .integer("supplier_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("RESTRICT");
    table.decimal("amount", 14, 2).notNullable();
    table.date("paid_at").notNullable().defaultTo(knex.fn.now());
    table.text("note").nullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["supplier_id", "paid_at"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable("supplier_payments");
  await knex.schema.dropTable("material_purchase_items");
  await knex.schema.dropTable("material_purchases");
  await knex.schema.dropTable("raw_materials");
  await knex.schema.dropTable("suppliers");
};
