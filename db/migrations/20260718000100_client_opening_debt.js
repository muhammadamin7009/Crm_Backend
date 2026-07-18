exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.decimal("opening_debt", 14, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("opening_debt");
  });
};
