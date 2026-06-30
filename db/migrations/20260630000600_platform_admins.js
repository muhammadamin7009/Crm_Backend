exports.up = async function (knex) {
  await knex.schema.createTable("platform_admins", (table) => {
    table.increments("id");
    table.string("username", 80).notNullable().unique();
    table.string("password", 350).notNullable();
    table.string("full_name", 150).nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  const firstSuperAdmin = await knex("users")
    .where({ role: "super_admin", is_deleted: false })
    .orderBy("id")
    .first();

  if (firstSuperAdmin) {
    await knex("platform_admins").insert({
      username: firstSuperAdmin.username,
      password: firstSuperAdmin.password,
      full_name: `${firstSuperAdmin.first_name} ${firstSuperAdmin.last_name}`.trim(),
    });
  }
};

exports.down = function (knex) {
  return knex.schema.dropTable("platform_admins");
};
