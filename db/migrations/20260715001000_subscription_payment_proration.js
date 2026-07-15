exports.up = async function (knex) {
  await knex.schema.alterTable("subscription_payments", (table) => {
    table.string("plan_code", 30).nullable();
    table.string("plan_name", 100).nullable();
    table.decimal("plan_monthly_price", 14, 2).nullable();
    table.integer("billing_days").nullable();
    table.decimal("gross_amount", 14, 2).notNullable().defaultTo(0);
    table.string("discount_type", 20).notNullable().defaultTo("none");
    table.decimal("discount_value", 14, 2).notNullable().defaultTo(0);
    table.decimal("discount_amount", 14, 2).notNullable().defaultTo(0);
    table.text("discount_reason").nullable();
    table
      .integer("platform_admin_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("platform_admins")
      .onDelete("SET NULL");
    table.index(["company_id", "period_from", "period_to"]);
  });

  await knex("subscription_payments").update({
    gross_amount: knex.raw("amount"),
  });

  await knex.raw(`
    ALTER TABLE subscription_payments
      ADD CONSTRAINT subscription_payments_billing_days_check
        CHECK (billing_days IS NULL OR billing_days > 0),
      ADD CONSTRAINT subscription_payments_discount_type_check
        CHECK (discount_type IN ('none', 'fixed', 'percent')),
      ADD CONSTRAINT subscription_payments_amounts_check
        CHECK (amount >= 0 AND gross_amount >= 0 AND discount_amount >= 0)
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE subscription_payments
      DROP CONSTRAINT IF EXISTS subscription_payments_billing_days_check,
      DROP CONSTRAINT IF EXISTS subscription_payments_discount_type_check,
      DROP CONSTRAINT IF EXISTS subscription_payments_amounts_check
  `);
  await knex.schema.alterTable("subscription_payments", (table) => {
    table.dropIndex(["company_id", "period_from", "period_to"]);
    table.dropColumns(
      "plan_code",
      "plan_name",
      "plan_monthly_price",
      "billing_days",
      "gross_amount",
      "discount_type",
      "discount_value",
      "discount_amount",
      "discount_reason",
      "platform_admin_id",
    );
  });
};
