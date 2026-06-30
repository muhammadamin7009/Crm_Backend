exports.up = async function (knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_tenant_user') THEN
        CREATE ROLE crm_tenant_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  await knex.raw("GRANT USAGE ON SCHEMA public TO crm_tenant_user");
  await knex.raw("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_tenant_user");
  await knex.raw("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_tenant_user");
  await knex.raw("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO crm_tenant_user");
};

exports.down = async function (knex) {
  await knex.raw("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM crm_tenant_user");
  await knex.raw("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM crm_tenant_user");
  await knex.raw("DROP ROLE IF EXISTS crm_tenant_user");
};
