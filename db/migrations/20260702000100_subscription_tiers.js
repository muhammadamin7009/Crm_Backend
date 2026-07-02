exports.up = async function (knex) {
  await knex.schema.alterTable("subscription_plans", (table) => {
    table.string("code", 30).unique().nullable();
    table.jsonb("features").notNullable().defaultTo("[]");
    table.integer("storage_mb").notNullable().defaultTo(1024);
  });

  const plans = [
    { code: "plus", name: "Plus", monthly_price: 299000, max_users: 10, storage_mb: 1024, features: JSON.stringify(["production_core"]) },
    { code: "pro", name: "Pro", monthly_price: 399000, max_users: 25, storage_mb: 3072, features: JSON.stringify(["production_core", "client_accounting", "supplier_accounting", "finance"]) },
    { code: "business", name: "Business", monthly_price: 499000, max_users: 50, storage_mb: 5120, features: JSON.stringify(["production_core", "client_accounting", "supplier_accounting", "finance", "audit_logs"]) },
  ];

  for (const plan of plans) {
    await knex("subscription_plans").insert(plan).onConflict("code").merge();
  }

  const business = await knex("subscription_plans").where({ code: "business" }).first();
  await knex("company_subscriptions").whereNull("plan_id").update({ plan_id: business.id });
};

exports.down = function (knex) {
  return knex.schema.alterTable("subscription_plans", (table) => {
    table.dropColumn("storage_mb");
    table.dropColumn("features");
    table.dropColumn("code");
  });
};
