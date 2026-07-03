/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id");
    table.string("first_name", 50).notNullable();
    table.string("last_name", 50).notNullable();
    table.string("username", 30).notNullable().unique();
    table.string("password", 350).notNullable();
    table
      .enu("role", ["super_admin", "admin", "client", "supplier", "customer", "worker"])
      .notNullable()
      .defaultTo("customer");
    table.string("phone", 30).unique().nullable();
    table.string("user_image");
    table.boolean("is_deleted").defaultTo(false);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("users");
};
