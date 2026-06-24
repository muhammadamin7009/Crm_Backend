/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("client_sales", (table) => {
    table.increments("id");
    table
      .integer("client_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.decimal("quantity", 14, 2).notNullable();
    table.decimal("unit_price", 14, 2).notNullable();
    table.decimal("total_amount", 14, 2).notNullable();
    table.decimal("paid_amount", 14, 2).notNullable().defaultTo(0);
    table.decimal("debt_amount", 14, 2).notNullable().defaultTo(0);
    table.date("sold_at").notNullable().defaultTo(knex.fn.now());
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

    table.index(["client_id", "sold_at"]);
    table.index(["product_id", "sold_at"]);
    table.index(["created_by", "sold_at"]);
    table.index(["is_deleted", "sold_at"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("client_sales");
};
