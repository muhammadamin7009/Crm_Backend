const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { applyActorScope } = require("./helpers");
const { formatOutputQuery, selectOutputFields } = require("./format-output");

const SORT_COLUMNS = {
  worked_at: "wo.worked_at",
  created_at: "wo.created_at",
  updated_at: "wo.updated_at",
  quantity: "wo.quantity",
  total_amount: "wo.total_amount",
};

const applyFilters = (query, filters) => {
  const { q, worker_id, product_id, department_id, date_from, date_to } = filters;

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("w.first_name", `%${q}%`)
        .orWhereILike("w.last_name", `%${q}%`)
        .orWhereILike("w.username", `%${q}%`)
        .orWhereILike("p.name", `%${q}%`)
        .orWhereILike("p.model", `%${q}%`)
        .orWhereILike("p.sku", `%${q}%`)
        .orWhereILike("d.name", `%${q}%`);
    });
  }

  if (worker_id) query.andWhere("wo.worker_id", Number(worker_id));
  if (product_id) query.andWhere("wo.product_id", Number(product_id));
  if (department_id) query.andWhere("wo.department_id", Number(department_id));
  if (date_from) query.andWhere("wo.worked_at", ">=", date_from);
  if (date_to) query.andWhere("wo.worked_at", "<=", date_to);

  return query;
};

const listWorkerOutputs = async (filters, actor) => {
  const {
    limit = 20,
    offset = 0,
    sort_by = "worked_at",
    sort_order = "desc",
    date_from,
    date_to,
  } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const query = applyActorScope(formatOutputQuery(), actor);
  applyFilters(query, filters);

  const countQuery = query.clone().clearSelect().countDistinct({ count: "wo.id" }).first();

  const totalQuery = query
    .clone()
    .clearSelect()
    .sum({ total_quantity: "wo.quantity" })
    .sum({ total_amount: "wo.total_amount" })
    .first();

  const [workerOutputs, { count }, totals] = await Promise.all([
    selectOutputFields(query.clone())
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .orderBy("wo.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
    totalQuery,
  ]);

  return {
    worker_outputs: workerOutputs,
    totals: {
      total_quantity: Number(totals.total_quantity || 0),
      total_amount: Number(totals.total_amount || 0),
    },
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listWorkerOutputs;
module.exports.applyFilters = applyFilters;
