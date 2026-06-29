const { BadRequestError } = require("../../shared/errors");
const { formatAdvanceQuery, selectAdvanceFields } = require("./format-advance");
const { resolveWorkerId } = require("./helpers");

const SORT_COLUMNS = { given_at: "wa.given_at", created_at: "wa.created_at", updated_at: "wa.updated_at", amount: "wa.amount" };

const listWorkerAdvances = async (filters, actor) => {
  const { q, date_from, date_to, limit = 20, offset = 0, sort_by = "given_at", sort_order = "desc" } = filters;
  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }
  const workerId = await resolveWorkerId(filters.worker_id, actor);
  const query = formatAdvanceQuery();
  if (workerId) query.andWhere("wa.worker_id", workerId);
  if (q) query.andWhere((qb) => qb.whereILike("w.first_name", `%${q}%`).orWhereILike("w.last_name", `%${q}%`).orWhereILike("w.username", `%${q}%`).orWhereILike("wa.note", `%${q}%`));
  if (date_from) query.andWhere("wa.given_at", ">=", date_from);
  if (date_to) query.andWhere("wa.given_at", "<=", date_to);

  const [rows, countRow, totalRow] = await Promise.all([
    selectAdvanceFields(query.clone()).orderBy(SORT_COLUMNS[sort_by], sort_order).orderBy("wa.id", "desc").limit(Number(limit)).offset(Number(offset)),
    query.clone().clearSelect().countDistinct({ count: "wa.id" }).first(),
    query.clone().clearSelect().sum({ total_advance: "wa.amount" }).first(),
  ]);
  return {
    worker_advances: rows,
    totals: { total_advance: Number(totalRow.total_advance || 0) },
    pageInfo: { total: Number(countRow.count), offset: Number(offset), limit: Number(limit) },
  };
};

module.exports = listWorkerAdvances;
