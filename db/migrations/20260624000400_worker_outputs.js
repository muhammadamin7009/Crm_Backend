/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("worker_outputs", (table) => {
    table.increments("id");
    table
      .integer("worker_id")
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
    table
      .integer("department_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("departments")
      .onDelete("RESTRICT");
    table.decimal("quantity", 14, 2).notNullable();
    table.decimal("price_per_unit", 14, 2).notNullable();
    table.decimal("total_amount", 14, 2).notNullable();
    table.date("worked_at").notNullable().defaultTo(knex.fn.now());
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

    table.index(["worker_id", "worked_at"]);
    table.index(["product_id", "worked_at"]);
    table.index(["department_id", "worked_at"]);
    table.index(["created_by", "worked_at"]);
    table.index(["is_deleted", "worked_at"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("worker_outputs");
};
