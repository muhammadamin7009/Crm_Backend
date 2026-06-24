/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

  await knex("users")
    .where({ role: "packer" })
    .update({ role: "worker", updated_at: knex.fn.now() });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'client', 'supplier', 'customer', 'worker'))
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

  await knex("users")
    .where({ role: "worker" })
    .update({ role: "packer", updated_at: knex.fn.now() });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'client', 'supplier', 'customer', 'packer'))
  `);
};
