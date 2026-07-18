const db = require("../../db");

const hasPermission = (actor, permission) => {
  if (actor?.role === "super_admin") return true;
  if (actor?.role !== "admin") return false;
  if (actor.permissions?.includes("*")) return true;
  return actor.permissions?.includes(permission);
};

const getDirectoryRoles = (actor) => {
  if (actor?.role !== "admin" || hasPermission(actor, "users.view")) return null;

  const roles = new Set();
  if (hasPermission(actor, "client_sales.view") || hasPermission(actor, "client_sales.manage")) {
    roles.add("client");
  }
  if (
    hasPermission(actor, "production.view") ||
    hasPermission(actor, "production.manage") ||
    hasPermission(actor, "payroll.view") ||
    hasPermission(actor, "payroll.manage")
  ) {
    roles.add("worker");
  }

  return [...roles];
};

const listUsers = async (
  {
    q,
    role,
    scope,
    is_deleted = false,
    limit = 20,
    offset = 0,
    sort_by = "created_at",
    sort_order = "desc",
  },
  actor,
) => {
  if (actor?.role === "worker") {
    const internalRoles = ["super_admin", "admin", "worker"];
    const query = db("users as u")
      .leftJoin("employee_profiles as ep", "ep.user_id", "u.id")
      .leftJoin("positions as p", "p.id", "ep.position_id")
      .leftJoin("departments as d", "d.id", "p.department_id")
      .where("u.is_deleted", false)
      .whereIn("u.role", internalRoles);

    if (q) {
      query.andWhere((qb) => {
        qb.whereILike("u.first_name", `%${q}%`)
          .orWhereILike("u.last_name", `%${q}%`)
          .orWhereILike("p.name", `%${q}%`)
          .orWhereILike("d.name", `%${q}%`);
      });
    }
    if (role && internalRoles.includes(role)) query.andWhere("u.role", role);

    const countQuery = query.clone().clearSelect().countDistinct({ count: "u.id" }).first();
    const sortColumn = sort_by === "updated_at" ? "u.updated_at" : "u.created_at";
    const [users, { count }] = await Promise.all([
      query
        .clone()
        .select(
          "u.id",
          "u.first_name",
          "u.last_name",
          "u.user_image",
          "u.role",
          "p.name as position_name",
          "d.name as department_name",
        )
        .orderBy(sortColumn, sort_order)
        .limit(Number(limit))
        .offset(Number(offset)),
      countQuery,
    ]);

    return {
      users,
      pageInfo: { total: Number(count), offset: Number(offset), limit: Number(limit) },
    };
  }

  const limitedRoles = getDirectoryRoles(actor);
  const scopeRoles =
    scope === "clients"
      ? ["client", "customer"]
      : scope === "staff"
        ? ["super_admin", "admin", "worker"]
        : null;
  const visibleRoles = limitedRoles
    ? scopeRoles
      ? limitedRoles.filter((item) => scopeRoles.includes(item))
      : limitedRoles
    : scopeRoles;
  const showDeleted =
    limitedRoles === null && actor?.role === "super_admin" && (is_deleted === true || is_deleted === "true");
  const query = db("users")
    .where({ is_deleted: showDeleted })
    .select(
      "id",
      "first_name",
      "last_name",
      "user_image",
      "username",
      "role",
      "phone",
      "created_by",
      "created_at",
      "updated_at",
      "is_deleted",
    );

  if (visibleRoles) {
    if (!visibleRoles.length) {
      query.whereRaw("1 = 0");
    } else if (role && visibleRoles.includes(role)) {
      query.andWhere("role", role);
    } else {
      query.whereIn("role", visibleRoles);
    }
  } else if (role) {
    query.andWhere("role", role);
  }

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("first_name", `%${q}%`)
        .orWhereILike("last_name", `%${q}%`)
        .orWhereILike("username", `%${q}%`)
        .orWhereILike("phone", `%${q}%`);
    });
  }

  const countQuery = query.clone().clearSelect().count({ count: "id" }).first();

  const [users, { count }] = await Promise.all([
    query.orderBy(sort_by, sort_order).limit(Number(limit)).offset(Number(offset)),
    countQuery,
  ]);

  return {
    users,
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listUsers;
