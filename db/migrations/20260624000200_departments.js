/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function (knex) {
  await knex.schema.createTable("departments", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable().unique();
    table.string("code", 50).notNullable().unique();
    table.text("description").nullable();
    table.integer("sort_order").notNullable().defaultTo(0);
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
    table.index(["sort_order"]);
  });

  await knex("departments").insert([
    {
      name: "Kroy",
      code: "kroy",
      description: "Mahsulotni kesish va bichish bo'limi",
      sort_order: 1,
    },
    {
      name: "Tikuv",
      code: "tikuv",
      description: "Mahsulotni tikish bo'limi",
      sort_order: 2,
    },
    {
      name: "Kosib",
      code: "kosib",
      description: "Kosiblik ishlari bo'limi",
      sort_order: 3,
    },
    {
      name: "Upakovka",
      code: "upakovka",
      description: "Tayyor mahsulotni upakovka qilish bo'limi",
      sort_order: 4,
    },
  ]);
};

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
exports.down = function (knex) {
  return knex.schema.dropTable("departments");
};
