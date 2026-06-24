const bcrypt = require("bcryptjs");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  await knex("users").del();

  await knex("users").insert([
    {
      id: 1,
      first_name: "Muhammadamin",
      last_name: "Rustamov",
      role: "super_admin",
      phone: "+998915717009",
      username: "muhammad",
      password: bcrypt.hashSync("12345678", 10),
      is_deleted: false,
      user_image: null,
    },
  ]);

  await knex.raw("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
};
