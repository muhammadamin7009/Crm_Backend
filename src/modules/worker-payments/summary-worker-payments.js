const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { applyActorScope } = require("./helpers");
const { formatPaymentQuery } = require("./format-payment");
const { applyFilters } = require("./list-worker-payments");

const GROUPS = {
  worker: {
    select: [
      "wp.worker_id as group_id",
      db.raw("CONCAT(w.first_name, ' ', w.last_name) as group_name"),
      "w.username as group_code",
    ],
    group: ["wp.worker_id", "w.first_name", "w.last_name", "w.username"],
    order: "group_name",
  },
  payment_type: {
    select: [
      "wp.payment_type as group_id",
      "wp.payment_type as group_name",
      db.raw("NULL as group_code"),
    ],
    group: ["wp.payment_type"],
    order: "wp.payment_type",
  },
  day: {
    select: [
      db.raw("wp.paid_at::date as group_id"),
      db.raw("wp.paid_at::date as group_name"),
      db.raw("NULL as group_code"),
    ],
    group: [db.raw("wp.paid_at::date")],
    order: "group_id",
  },
};

const summaryWorkerPayments = async (filters, actor) => {
  const { group_by = "worker", date_from, date_to } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const group = GROUPS[group_by];
  const query = applyActorScope(formatPaymentQuery(), actor);
  applyFilters(query, filters);

  const rows = await query
    .clone()
    .clearSelect()
    .select(...group.select)
    .count({ payments_count: "wp.id" })
    .sum({ cash_paid: "wp.amount" })
    .sum({ advance_deducted: "wp.advance_deduction" })
    .sum({ other_deducted: "wp.other_deduction" })
    .groupBy(group.group)
    .orderBy(group.order, group_by === "day" ? "desc" : "asc");

  return {
    group_by,
    summary: rows.map((row) => ({
      ...row,
      payments_count: Number(row.payments_count || 0),
      total_paid: Number(row.cash_paid || 0) + Number(row.advance_deducted || 0) + Number(row.other_deducted || 0),
      cash_paid: Number(row.cash_paid || 0),
      advance_deducted: Number(row.advance_deducted || 0),
      other_deducted: Number(row.other_deducted || 0),
    })),
  };
};

module.exports = summaryWorkerPayments;
