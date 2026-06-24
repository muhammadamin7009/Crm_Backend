/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("products", (table) => {
    table.increments("id");
    table
      .integer("category_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("categories")
      .onDelete("SET NULL");
    table.string("name", 150).notNullable();
    table.string("model", 100).nullable();
    table.string("sku", 100).notNullable().unique();
    table.string("color", 50).nullable();
    table.string("unit", 20).notNullable().defaultTo("dona");
    table.text("description").nullable();
    table.decimal("purchase_price", 14, 2).notNullable().defaultTo(0);
    table.decimal("sale_price", 14, 2).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);

    table.index(["category_id"]);
    table.index(["name"]);
    table.index(["is_deleted", "is_active"]);
    table.index(["created_at"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("products");
};
