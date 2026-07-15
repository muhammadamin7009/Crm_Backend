const db = require("../../db");
const { ForbiddenError } = require("../errors");

const normalize = (permissions) =>
  (Array.isArray(permissions) ? permissions : [permissions]).filter(Boolean);

const hasPermission = (...requiredPermissions) => {
  const required = normalize(requiredPermissions);

  return async (req, _res, next) => {
    try {
      if (!required.length) return next();
      if (req.user?.role === "super_admin") return next();
      const role = req.user?.role;
      const workerInventoryCheck =
        role === "worker" && required.some((key) => key.startsWith("inventory."));
      if (role !== "admin" && !workerInventoryCheck) return next();

      const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : null;
      const allowed = permissions
        ? new Set(permissions)
        : new Set(
            (
              await db("user_permissions")
                .where({ user_id: req.user.id, allowed: true })
                .whereIn("permission_key", required)
                .select("permission_key")
            ).map((row) => row.permission_key),
          );

      const isInventoryRequest = required.some((key) => key.startsWith("inventory."));
      const ok =
        allowed.has("*") ||
        required.some((key) => allowed.has(key)) ||
        (isInventoryRequest && allowed.has("inventory.manage"));

      if (!ok) {
        throw new ForbiddenError("Sizda bu amal uchun ruxsat yo'q");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = hasPermission;
