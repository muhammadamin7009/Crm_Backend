const db = require("../../db");
const bcrypt = require("bcryptjs");
const { BadRequestError } = require("../../shared/errors");
const { normalizeUserInput } = require("./normalize-user-input");
const { assertCanManageClientDebt, normalizeDebt } = require("./client-debt");

const createByStaff = async (payload, actor) => {
  const {
    first_name,
    last_name,
    username,
    password,
    phone = null,
    user_image,
    role = "customer",
  } = normalizeUserInput(payload);

  // staff hech qachon admin/super_admin bera olmaydi
  if (role === "admin" || role === "super_admin") {
    throw new BadRequestError("Bu role berib bo'lmaydi");
  }

  const clientDebtAmount =
    payload.client_debt_amount === undefined
      ? 0
      : normalizeDebt(payload.client_debt_amount);
  if (payload.client_debt_amount !== undefined)
    assertCanManageClientDebt(actor);
  if (role !== "client" && clientDebtAmount !== 0) {
    throw new BadRequestError("Boshlang'ich qarz faqat mijoz uchun kiritiladi");
  }

  const existing = await db("users")
    .where({ username, is_deleted: false })
    .first();

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
      opening_debt: role === "client" ? clientDebtAmount : 0,
      is_deleted: false,
      created_by: actor.id, // ✅ kim yaratgani
    })
    .returning([
      "id",
      "first_name",
      "last_name",
      "username",
      "role",
      "phone",
      "created_at",
    ]);

  return { new_user: user };
};

module.exports = createByStaff;
