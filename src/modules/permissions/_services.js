const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");
const {
  PERMISSIONS,
  PERMISSION_PRESETS,
  getPermissionPreset,
  INVENTORY_WORKER_PERMISSIONS,
} = require("../../shared/auth/permissions");

const MANAGED_ROLES = ["admin", "worker"];

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

const getRequiredViewPermission = (key) => {
  if (!key?.endsWith(".manage")) return null;
  return key.replace(".manage", ".view");
};

const normalizePermissions = (permissions = []) => {
  const current = new Set(permissions);

  [...current].forEach((key) => {
    const viewKey = getRequiredViewPermission(key);
    if (viewKey) current.add(viewKey);
    if (key.startsWith("inventory.") && key !== "inventory.view") {
      current.add("inventory.view");
    }
  });

  return [...current];
};

const listPermissionSettings = async () => {
  const users = await db("users")
    .whereIn("role", MANAGED_ROLES)
    .where({ is_deleted: false })
    .select(
      "id",
      "first_name",
      "last_name",
      "username",
      "phone",
      "user_image",
      "role",
      "updated_at",
    )
    .orderBy("first_name", "asc");

  const userIds = users.map((user) => user.id);
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
    presets: PERMISSION_PRESETS,
    users: users.map((user) => ({
      ...user,
      permissions: normalizePermissions(byUser[user.id] || []),
    })),
  };
};

const listPermissionPresets = () => ({ presets: PERMISSION_PRESETS });

const getUserPermissionSettings = async (id) => {
  const user = await db("users")
    .where({ id, is_deleted: false })
    .whereIn("role", MANAGED_ROLES)
    .select("id", "first_name", "last_name", "username", "phone", "user_image", "role")
    .first();

  if (!user) throw new NotFoundError("Foydalanuvchi topilmadi");

  const rows = await db("user_permissions")
    .where({ user_id: id, allowed: true })
    .select("permission_key");

  return {
    user,
    permissions: normalizePermissions(rows.map((row) => row.permission_key)),
  };
};

const updateUserPermissions = async (id, permissions, actor) => {
  if (Number(id) === Number(actor.id)) {
    throw new BadRequestError("O'zingizning ruxsatlaringizni shu yerdan o'zgartirib bo'lmaydi");
  }

  const target = await db("users")
    .where({ id, is_deleted: false })
    .whereIn("role", MANAGED_ROLES)
    .select("id", "company_id", "first_name", "last_name", "username", "role")
    .first();

  if (!target) throw new NotFoundError("Foydalanuvchi topilmadi");

  const allowedKeys = new Set(PERMISSIONS.map((item) => item.key));
  const roleAllowedKeys =
    target.role === "worker" ? new Set(INVENTORY_WORKER_PERMISSIONS) : allowedKeys;
  const cleanPermissions = normalizePermissions([...new Set(permissions)]).filter(
    (key) => allowedKeys.has(key) && roleAllowedKeys.has(key),
  );

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
    message: "Foydalanuvchi ruxsatlari saqlandi",
    user: target,
    permissions: cleanPermissions,
  };
};

const applyPermissionPreset = async (id, presetKey, actor) => {
  const preset = getPermissionPreset(presetKey);
  if (!preset) throw new BadRequestError("Ruxsat shabloni topilmadi");

  const result = await updateUserPermissions(id, preset.permissions, actor);
  return { ...result, message: "Ruxsat shabloni saqlandi", preset };
};

module.exports = {
  listPermissionSettings,
  listPermissionPresets,
  getUserPermissionSettings,
  updateUserPermissions,
  applyPermissionPreset,
};
