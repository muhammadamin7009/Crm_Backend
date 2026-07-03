const db = require("../../db");
const bcrypt = require("bcryptjs");
const { BadRequestError } = require("../../shared/errors");

const registration = async (
  { first_name, last_name, username, password, user_image, phone = null },
  company,
) => {
  // 1️⃣ username unique tekshiramiz
  const existing = await db("users").where({ username }).andWhere({ is_deleted: false }).first();

  if (existing) {
    throw new BadRequestError("Username already exists");
  }

  // 2️⃣ password hash
  const hashPassword = await bcrypt.hash(password, 10);

  // 3️⃣ insert
  const [user] = await db("users")
    .insert({
      first_name,
      last_name,
      username,
      user_image: user_image || null,
      password: hashPassword,
      role: "customer",
      phone,
      is_deleted: false,
      company_id: company.id,
    })
    .returning(["id", "first_name", "last_name", "username", "role", "phone", "created_at"]);

  // 4️⃣ password qaytarmaymiz
  return { new_user: user };
};

module.exports = registration;
