exports.up = async function (knex) {
  await knex.schema.createTable("worker_advances", (table) => {
    table.increments("id");
    table
      .integer("worker_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("amount", 14, 2).notNullable();
    table.date("given_at").notNullable().defaultTo(knex.fn.now());
    table.text("note").nullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.integer("source_payment_id").unsigned().nullable().unique();
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["worker_id", "given_at"]);
    table.index(["is_deleted", "given_at"]);
  });

  await knex.schema.alterTable("worker_payments", (table) => {
    table.decimal("advance_deduction", 14, 2).notNullable().defaultTo(0);
  });

  await knex.raw(`
    INSERT INTO worker_advances
      (worker_id, amount, given_at, note, created_by, source_payment_id, is_deleted, created_at, updated_at)
    SELECT worker_id, amount, paid_at, note, created_by, id, false, created_at, updated_at
    FROM worker_payments
    WHERE payment_type = 'advance' AND is_deleted = false
  `);

  await knex("worker_payments")
    .where({ payment_type: "advance", is_deleted: false })
    .update({ is_deleted: true, updated_at: knex.fn.now() });
};

exports.down = async function (knex) {
  const migrated = await knex("worker_advances")
    .whereNotNull("source_payment_id")
    .pluck("source_payment_id");
  if (migrated.length) {
    await knex("worker_payments")
      .whereIn("id", migrated)
      .update({ is_deleted: false, updated_at: knex.fn.now() });
  }
  await knex.schema.alterTable("worker_payments", (table) => table.dropColumn("advance_deduction"));
  await knex.schema.dropTable("worker_advances");
};
