/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("users", (t) => {
    t.integer("created_by").unsigned().nullable().references("id").inTable("users");
    // xohlasa: t.index(["created_by"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("users", (t) => {
    t.dropColumn("created_by");
  });
};
