const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const listSessions = async (actor) => ({
  sessions: await db("user_sessions")
    .where({ user_id: actor.id })
    .whereNull("revoked_at")
    .where("expires_at", ">", db.fn.now())
    .select("id", "device_name", "ip_address", "last_used_at", "created_at", "expires_at")
    .orderBy("last_used_at", "desc")
    .then((rows) => rows.map((row) => ({ ...row, is_current: row.id === actor.session_id }))),
});

const revokeSession = async (id, actor) => {
  const updated = await db("user_sessions")
    .where({ id, user_id: actor.id })
    .whereNull("revoked_at")
    .update({ revoked_at: db.fn.now() });
  if (!updated) throw new NotFoundError("Sessiya topilmadi");
  return { message: "Qurilmadan chiqildi", current_session_revoked: id === actor.session_id };
};

const revokeOtherSessions = async (actor) => {
  const count = await db("user_sessions")
    .where({ user_id: actor.id })
    .whereNot({ id: actor.session_id })
    .whereNull("revoked_at")
    .update({ revoked_at: db.fn.now() });
  return { message: "Boshqa qurilmalardan chiqildi", revoked_count: count };
};

module.exports = { listSessions, revokeSession, revokeOtherSessions };
