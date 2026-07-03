/**
 * Supplier companies are stored in the suppliers table. They are not users.
 * Existing supplier-role users are preserved as customers.
 */
exports.up = async function (knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

  await knex("users")
    .where({ role: "supplier" })
    .update({ role: "customer", updated_at: knex.fn.now() });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'client', 'customer', 'worker'))
  `);
};

exports.down = async function (knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'client', 'supplier', 'customer', 'worker'))
  `);
};
