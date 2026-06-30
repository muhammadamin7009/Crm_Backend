const db = require("../../db");
const { UnauthorizedError } = require("../../shared/errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../shared/config");

const login = async ({ username, password }, company) => {
  const existing = await db("users")
    .where({ username, is_deleted: false })
    .select(
      "id",
      "username",
      "password",
      "user_image",
      "role",
      "first_name",
      "last_name",
      "phone",
      "company_id",
    )
    .first();

  if (!existing) {
    throw new UnauthorizedError("Username yoki password xato kiritilgan");
  }

  const passwordCompare = await bcrypt.compare(password, existing.password);

  if (!passwordCompare) {
    throw new UnauthorizedError("Username yoki password xato kiritilgan");
  }

  const token = jwt.sign(
    {
      id: existing.id,
      role: existing.role,
      company_id: existing.company_id,
      company_slug: company.slug,
    },
    config.jwt.secret,
    { expiresIn: "2d" },
  );

  // passwordni qaytarmaymiz
  const user = {
    id: existing.id,
    username: existing.username,
    role: existing.role,
    first_name: existing.first_name,
    last_name: existing.last_name,
    user_image: existing.user_image,
    phone: existing.phone,
    company_id: existing.company_id,
    company_slug: company.slug,
    company_name: company.name,
  };

  return {
    token,
    user,
  };
};

module.exports = login;
