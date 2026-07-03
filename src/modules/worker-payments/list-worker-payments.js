const { BadRequestError } = require("../../shared/errors");
const { applyActorScope } = require("./helpers");
const { formatPaymentQuery, selectPaymentFields } = require("./format-payment");

const SORT_COLUMNS = {
  paid_at: "wp.paid_at",
  created_at: "wp.created_at",
  updated_at: "wp.updated_at",
  amount: "wp.amount",
};

const applyFilters = (query, filters) => {
  const { q, worker_id, payment_type, date_from, date_to } = filters;

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("w.first_name", `%${q}%`)
        .orWhereILike("w.last_name", `%${q}%`)
        .orWhereILike("w.username", `%${q}%`)
        .orWhereILike("wp.note", `%${q}%`);
    });
  }

  if (worker_id) query.andWhere("wp.worker_id", Number(worker_id));
  if (payment_type) query.andWhere("wp.payment_type", payment_type);
  if (date_from) query.andWhere("wp.paid_at", ">=", date_from);
  if (date_to) query.andWhere("wp.paid_at", "<=", date_to);

  return query;
};

const listWorkerPayments = async (filters, actor) => {
  const {
    limit = 20,
    offset = 0,
    sort_by = "paid_at",
    sort_order = "desc",
    date_from,
    date_to,
  } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const query = applyActorScope(formatPaymentQuery(), actor);
  applyFilters(query, filters);

  const countQuery = query.clone().clearSelect().countDistinct({ count: "wp.id" }).first();

  const totalQuery = query
    .clone()
    .clearSelect()
    .sum({ cash_paid: "wp.amount" })
    .sum({ advance_deducted: "wp.advance_deduction" })
    .sum({ other_deducted: "wp.other_deduction" })
    .first();

  const [workerPayments, { count }, totals] = await Promise.all([
    selectPaymentFields(query.clone())
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .orderBy("wp.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
    totalQuery,
  ]);

  return {
    worker_payments: workerPayments,
    totals: {
      total_paid:
        Number(totals.cash_paid || 0) +
        Number(totals.advance_deducted || 0) +
        Number(totals.other_deducted || 0),
      cash_paid: Number(totals.cash_paid || 0),
      advance_deducted: Number(totals.advance_deducted || 0),
      other_deducted: Number(totals.other_deducted || 0),
    },
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listWorkerPayments;
module.exports.applyFilters = applyFilters;
