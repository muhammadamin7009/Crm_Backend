/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("product_department_prices", (table) => {
    table.increments("id");
    table
      .integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table
      .integer("department_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("departments")
      .onDelete("CASCADE");
    table.decimal("price_per_unit", 14, 2).notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);

    table.unique(["product_id", "department_id"]);
    table.index(["product_id", "is_active"]);
    table.index(["department_id", "is_active"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("product_department_prices");
};
