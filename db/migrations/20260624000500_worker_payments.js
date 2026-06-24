/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = function (knex) {
  return knex.schema.createTable("worker_payments", (table) => {
    table.increments("id");
    table
      .integer("worker_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("amount", 14, 2).notNullable();
    table
      .enu("payment_type", ["salary", "advance", "bonus", "other"])
      .notNullable()
      .defaultTo("salary");
    table.date("paid_at").notNullable().defaultTo(knex.fn.now());
    table.date("period_from").nullable();
    table.date("period_to").nullable();
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

    table.index(["worker_id", "paid_at"]);
    table.index(["payment_type", "paid_at"]);
    table.index(["created_by", "paid_at"]);
    table.index(["is_deleted", "paid_at"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("worker_payments");
};
