exports.up = function (knex) {
  return knex.schema.alterTable("worker_payments", (table) => {
    table.decimal("other_deduction", 14, 2).notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("worker_payments", (table) => {
    table.dropColumn("other_deduction");
  });
};
