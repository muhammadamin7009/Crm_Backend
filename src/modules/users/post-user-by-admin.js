const db = require("../../db");
const bcrypt = require("bcryptjs");
const { BadRequestError } = require("../../shared/errors");

const createByAdmin = async ({
  first_name,
  last_name,
  username,
  password,
  user_image,
  phone = null,
  role,
}) => {
  // super_admin yaratishga ruxsat yo'q (projectda 1ta)
  if (role === "super_admin") {
    throw new BadRequestError("super_admin role berib bo‘lmaydi");
  }

  const existing = await db("users").where({ username, is_deleted: false }).first();

  if (existing) throw new BadRequestError("Username already exists");

  const hashPassword = await bcrypt.hash(password, 10);

  const [user] = await db("users")
    .insert({
      first_name,
      last_name,
      username,
      password: hashPassword,
      user_image: user_image || null,
      phone,
      role,
      is_deleted: false,
    })
    .returning(["id", "first_name", "last_name", "username", "role", "phone", "created_at"]);

  return { new_user: user };
};

module.exports = createByAdmin;
