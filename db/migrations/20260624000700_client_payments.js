/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("client_payments", (table) => {
    table.increments("id");
    table
      .integer("client_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .integer("client_sale_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("client_sales")
      .onDelete("SET NULL");
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

    table.index(["client_id", "paid_at"]);
    table.index(["client_sale_id", "paid_at"]);
    table.index(["is_deleted", "paid_at"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("client_payments");
};
