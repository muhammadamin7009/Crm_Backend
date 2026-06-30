const PLATFORM_TABLES = [
  "companies",
  "subscription_plans",
  "company_subscriptions",
  "subscription_payments",
  "platform_admins",
];

exports.up = async function (knex) {
  for (const tableName of PLATFORM_TABLES) {
    await knex.raw("REVOKE ALL PRIVILEGES ON TABLE ?? FROM crm_tenant_user", [tableName]);
  }
};

exports.down = async function (knex) {
  for (const tableName of PLATFORM_TABLES) {
    await knex.raw("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ?? TO crm_tenant_user", [tableName]);
  }
};
