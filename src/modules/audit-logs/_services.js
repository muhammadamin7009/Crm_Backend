const db = require("../../db");

const listAuditLogs = async ({ q = "", action = "", limit = 20, offset = 0 }) => {
  const query = db("audit_logs as al").leftJoin("users as u", "u.id", "al.actor_user_id");

  if (action) query.where("al.action", action);
  if (q) {
    query.where((builder) => {
      builder
        .whereILike("al.entity_type", `%${q}%`)
        .orWhereILike("al.path", `%${q}%`)
        .orWhereILike("u.first_name", `%${q}%`)
        .orWhereILike("u.last_name", `%${q}%`)
        .orWhereILike("u.username", `%${q}%`);
    });
  }

  const [rows, count] = await Promise.all([
    query
      .clone()
      .select("al.*", "u.first_name", "u.last_name", "u.username")
      .orderBy("al.created_at", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().clearSelect().clearOrder().count({ count: "al.id" }).first(),
  ]);

  return {
    audit_logs: rows,
    pageInfo: { total: Number(count.count), limit: Number(limit), offset: Number(offset) },
  };
};

module.exports = { listAuditLogs };
