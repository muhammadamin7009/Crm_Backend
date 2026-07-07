const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");
const { PERMISSIONS } = require("../../shared/auth/permissions");

const groupPermissions = (permissions) => {
  const groups = [];
  const byGroup = new Map();

  permissions.forEach((permission) => {
    if (!byGroup.has(permission.group)) {
      const group = { group: permission.group, permissions: [] };
      byGroup.set(permission.group, group);
      groups.push(group);
    }
    byGroup.get(permission.group).permissions.push(permission);
  });

  return groups;
};

const listPermissionSettings = async () => {
  const admins = await db("users")
    .where({ role: "admin", is_deleted: false })
    .select("id", "first_name", "last_name", "username", "phone", "user_image", "role", "updated_at")
    .orderBy("first_name", "asc");

  const userIds = admins.map((admin) => admin.id);
  const rows = userIds.length
    ? await db("user_permissions")
        .whereIn("user_id", userIds)
        .where({ allowed: true })
        .select("user_id", "permission_key")
    : [];

  const byUser = rows.reduce((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push(row.permission_key);
    return acc;
  }, {});

  return {
    permissions: PERMISSIONS,
    groups: groupPermissions(PERMISSIONS),
    admins: admins.map((admin) => ({
      ...admin,
      permissions: byUser[admin.id] || [],
    })),
  };
};

const getUserPermissionSettings = async (id) => {
  const user = await db("users")
    .where({ id, role: "admin", is_deleted: false })
    .select("id", "first_name", "last_name", "username", "phone", "user_image", "role")
    .first();

  if (!user) throw new NotFoundError("Admin topilmadi");

  const rows = await db("user_permissions")
    .where({ user_id: id, allowed: true })
    .select("permission_key");

  return {
    user,
    permissions: rows.map((row) => row.permission_key),
  };
};

const updateUserPermissions = async (id, permissions, actor) => {
  if (Number(id) === Number(actor.id)) {
    throw new BadRequestError("O'zingizning ruxsatlaringizni shu yerdan o'zgartirib bo'lmaydi");
  }

  const target = await db("users")
    .where({ id, role: "admin", is_deleted: false })
    .select("id", "company_id", "first_name", "last_name", "username", "role")
    .first();

  if (!target) throw new NotFoundError("Admin topilmadi");

  const allowedKeys = new Set(PERMISSIONS.map((item) => item.key));
  const cleanPermissions = [...new Set(permissions)].filter((key) => allowedKeys.has(key));

  await db.transaction(async (trx) => {
    await trx("user_permissions").where({ user_id: target.id }).delete();

    if (cleanPermissions.length) {
      await trx("user_permissions").insert(
        cleanPermissions.map((permissionKey) => ({
          company_id: target.company_id,
          user_id: target.id,
          permission_key: permissionKey,
          allowed: true,
        })),
      );
    }
  });

  return {
    message: "Admin ruxsatlari saqlandi",
    user: target,
    permissions: cleanPermissions,
  };
};

module.exports = {
  listPermissionSettings,
  getUserPermissionSettings,
  updateUserPermissions,
};
