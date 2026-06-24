const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { formatPaymentQuery } = require("./format-payment");
const { applyFilters } = require("./list-client-payments");

const GROUPS = {
  client: {
    select: [
      "cp.client_id as group_id",
      db.raw("CONCAT(cl.first_name, ' ', cl.last_name) as group_name"),
      "cl.username as group_code",
    ],
    group: ["cp.client_id", "cl.first_name", "cl.last_name", "cl.username"],
    order: "group_name",
  },
  day: {
    select: [
      db.raw("cp.paid_at::date as group_id"),
      db.raw("cp.paid_at::date as group_name"),
      db.raw("NULL as group_code"),
    ],
    group: [db.raw("cp.paid_at::date")],
    order: "group_id",
  },
};

const summaryClientPayments = async (filters) => {
  const { group_by = "client", date_from, date_to } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const group = GROUPS[group_by];
  const query = applyFilters(formatPaymentQuery(), filters);

  const rows = await query
    .clone()
    .clearSelect()
    .select(...group.select)
    .count({ payments_count: "cp.id" })
    .sum({ total_paid: "cp.amount" })
    .groupBy(group.group)
    .orderBy(group.order, group_by === "day" ? "desc" : "asc");

  return {
    group_by,
    summary: rows.map((row) => ({
      ...row,
      payments_count: Number(row.payments_count || 0),
      total_paid: Number(row.total_paid || 0),
    })),
  };
};

module.exports = summaryClientPayments;
