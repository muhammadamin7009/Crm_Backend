exports.up = async function (knex) {
  await knex.schema.alterTable("client_returns", (table) => {
    table.decimal("refund_amount", 14, 2).notNullable().defaultTo(0);
    table
      .integer("refund_account_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("financial_accounts")
      .onDelete("SET NULL");
  });

  await knex.raw(`
    WITH duplicates AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY company_id, source_type, source_id
               ORDER BY id
             ) AS row_number
      FROM cash_transactions
      WHERE source_id IS NOT NULL AND is_deleted = false
    )
    UPDATE cash_transactions
       SET is_deleted = true,
           updated_at = NOW()
     WHERE id IN (SELECT id FROM duplicates WHERE row_number > 1)
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS cash_transactions_active_source_unique
    ON cash_transactions (company_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND is_deleted = false
  `);
};

exports.down = async function (knex) {
  await knex.raw("DROP INDEX IF EXISTS cash_transactions_active_source_unique");
  await knex.schema.alterTable("client_returns", (table) => {
    table.dropColumn("refund_account_id");
    table.dropColumn("refund_amount");
  });
};
