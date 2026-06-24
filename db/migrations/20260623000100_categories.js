/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("categories", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.text("description").nullable();
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

    table.index(["is_deleted", "is_active"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("categories");
};
