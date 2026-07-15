const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const getPermissions = async (user) => {
  if (user.role === "super_admin") return ["*"];
  if (!["admin", "worker"].includes(user.role)) return [];

  const rows = await db("user_permissions")
    .where({ user_id: user.id, allowed: true })
    .select("permission_key");

  return rows.map((row) => row.permission_key);
};

const getMeService = async (actor) => {
  const me = await db("users")
    .where({ id: actor.id, is_deleted: false })
    .select(
      "id",
      "first_name",
      "last_name",
      "username",
      "user_image",
      "role",
      "phone",
      "created_at",
      "updated_at",
    )
    .first();

  if (!me) {
    throw new NotFoundError("User topilmadi");
  }

  return { me: { ...me, permissions: await getPermissions(me) } };
};

module.exports = getMeService;
