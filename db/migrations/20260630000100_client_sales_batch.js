exports.up = function (knex) {
  return knex.schema.alterTable("client_sales", (table) => {
    table.uuid("batch_id").nullable().index();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("client_sales", (table) => {
    table.dropColumn("batch_id");
  });
};
