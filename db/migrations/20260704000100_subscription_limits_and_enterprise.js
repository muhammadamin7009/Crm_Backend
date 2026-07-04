exports.up = async function (knex) {
  await knex("subscription_plans").where({ code: "plus" }).update({ max_users: 15 });
  await knex("subscription_plans").where({ code: "pro" }).update({ max_users: 30 });
  await knex("subscription_plans").where({ code: "business" }).update({ max_users: 60 });

  await knex("subscription_plans")
    .insert({
      code: "enterprise",
      name: "Enterprise",
      monthly_price: 699000,
      max_users: 100,
      storage_mb: 10240,
      features: JSON.stringify([
        "production_core",
        "client_accounting",
        "supplier_accounting",
        "finance",
        "audit_logs",
      ]),
      is_active: true,
    })
    .onConflict("code")
    .merge();
};

exports.down = async function (knex) {
  const business = await knex("subscription_plans").where({ code: "business" }).first("id");
  const enterprise = await knex("subscription_plans").where({ code: "enterprise" }).first("id");
  if (business && enterprise) {
    await knex("company_subscriptions")
      .where({ plan_id: enterprise.id })
      .update({ plan_id: business.id });
  }
  await knex("subscription_plans").where({ code: "enterprise" }).delete();
  await knex("subscription_plans").where({ code: "plus" }).update({ max_users: 10 });
  await knex("subscription_plans").where({ code: "pro" }).update({ max_users: 25 });
  await knex("subscription_plans").where({ code: "business" }).update({ max_users: 50 });
};
