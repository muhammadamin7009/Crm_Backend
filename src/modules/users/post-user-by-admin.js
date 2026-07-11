const db = require("../../db");
const bcrypt = require("bcryptjs");
const { BadRequestError } = require("../../shared/errors");
const { normalizeUserInput } = require("./normalize-user-input");
const { getPermissionPreset } = require("../../shared/auth/permissions");

const createByAdmin = async (payload) => {
  const { first_name, last_name, username, password, user_image, phone = null, role } =
    normalizeUserInput(payload);

  // super_admin yaratishga ruxsat yo'q (projectda 1ta)
  if (role === "super_admin") {
    throw new BadRequestError("super_admin role berib bo‘lmaydi");
  }

  const existing = await db("users").where({ username, is_deleted: false }).first();

  if (existing) throw new BadRequestError("Username already exists");

  const hashPassword = await bcrypt.hash(password, 10);
  const preset = payload.permission_preset ? getPermissionPreset(payload.permission_preset) : null;

  const user = await db.transaction(async (trx) => {
    const [created] = await trx("users")
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
      .returning(["id", "company_id", "first_name", "last_name", "username", "role", "phone", "created_at"]);

    if (role === "admin" && preset) {
      await trx("user_permissions").insert(
        preset.permissions.map((permissionKey) => ({
          company_id: created.company_id,
          user_id: created.id,
          permission_key: permissionKey,
          allowed: true,
        })),
      );
    }

    return created;
  });

  return { new_user: user, permission_preset: preset };
};

module.exports = createByAdmin;
