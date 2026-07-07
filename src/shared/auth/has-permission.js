const db = require("../../db");
const { ForbiddenError } = require("../errors");

const normalize = (permissions) => (Array.isArray(permissions) ? permissions : [permissions]).filter(Boolean);

const hasPermission = (...requiredPermissions) => {
  const required = normalize(requiredPermissions);

  return async (req, _res, next) => {
    try {
      if (!required.length) return next();
      if (req.user?.role === "super_admin") return next();
      if (req.user?.role !== "admin") return next();

      const rows = await db("user_permissions")
        .where({ user_id: req.user.id, allowed: true })
        .whereIn("permission_key", required)
        .select("permission_key");

      const allowed = new Set(rows.map((row) => row.permission_key));
      const ok = required.some((key) => allowed.has(key));

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
