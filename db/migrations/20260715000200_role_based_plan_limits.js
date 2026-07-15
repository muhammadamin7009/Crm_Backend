const LIMITS = {
  plus: { max_workers: 15, max_clients: 20, max_admins: 2, monthly_price: 299000 },
  pro: { max_workers: 30, max_clients: 40, max_admins: 4, monthly_price: 399000 },
  business: { max_workers: 60, max_clients: 80, max_admins: 10, monthly_price: 499000 },
  enterprise: { max_workers: 100, max_clients: 150, max_admins: 20, monthly_price: 699000 },
};

exports.up = async function (knex) {
  await knex.schema.alterTable("subscription_plans", (table) => {
    table.integer("max_workers").nullable();
    table.integer("max_clients").nullable();
    table.integer("max_admins").nullable();
  });

  for (const [code, limits] of Object.entries(LIMITS)) {
    await knex("subscription_plans").where({ code }).update(limits);
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable("subscription_plans", (table) => {
    table.dropColumn("max_admins");
    table.dropColumn("max_clients");
    table.dropColumn("max_workers");
  });
};
