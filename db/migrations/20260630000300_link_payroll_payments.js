exports.up = async function (knex) {
  await knex.schema.alterTable("worker_payments", (table) => {
    table
      .integer("payroll_line_id")
      .unsigned()
      .nullable()
      .unique()
      .references("id")
      .inTable("payroll_lines")
      .onDelete("SET NULL");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("worker_payments", (table) => {
    table.dropColumn("payroll_line_id");
  });
};
