const db = require("../../db");
const bcrypt = require("bcryptjs");
const { BadRequestError } = require("../../shared/errors");

const createByStaff = async (payload, actor) => {
  const {
    first_name,
    last_name,
    username,
    password,
    phone = null,
    user_image,
    role = "customer",
  } = payload;

  // staff hech qachon admin/super_admin bera olmaydi
  if (role === "admin" || role === "super_admin") {
    throw new BadRequestError("Bu role berib bo'lmaydi");
  }

  const existing = await db("users").where({ username, is_deleted: false }).first();

  if (existing) throw new BadRequestError("Username already exists");

  const hash = await bcrypt.hash(password, 10);

  const [user] = await db("users")
    .insert({
      first_name,
      last_name,
      username,
      user_image: user_image || null,
      password: hash,
      phone,
      role,
      is_deleted: false,
      created_by: actor.id, // ✅ kim yaratgani
    })
    .returning(["id", "first_name", "last_name", "username", "role", "phone", "created_at"]);

  return { new_user: user };
};

module.exports = createByStaff;
