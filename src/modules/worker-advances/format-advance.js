const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const formatAdvanceQuery = () =>
  db("worker_advances as wa")
    .leftJoin("users as w", "w.id", "wa.worker_id")
    .leftJoin("users as c", "c.id", "wa.created_by")
    .where("wa.is_deleted", false);

const selectAdvanceFields = (query) =>
  query.select(
    "wa.id",
    "wa.worker_id",
    db.raw("CONCAT(w.first_name, ' ', w.last_name) as worker_name"),
    "w.username as worker_username",
    "wa.amount",
    "wa.given_at",
    "wa.note",
    "wa.created_by",
    db.raw("CONCAT(c.first_name, ' ', c.last_name) as created_by_name"),
    "wa.created_at",
    "wa.updated_at",
  );

const getFormattedAdvance = async (id) => {
  const advance = await selectAdvanceFields(formatAdvanceQuery().where("wa.id", id)).first();
  if (!advance) throw new NotFoundError("Avans topilmadi");
  return advance;
};

module.exports = { formatAdvanceQuery, getFormattedAdvance, selectAdvanceFields };
