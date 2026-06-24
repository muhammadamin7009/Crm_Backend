/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("product_images", (table) => {
    table.increments("id");
    table
      .integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table.string("image_url", 500).notNullable();
    table.boolean("is_primary").notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.index(["product_id"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("product_images");
};
