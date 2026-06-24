const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { applyActorScope } = require("./helpers");
const { formatOutputQuery } = require("./format-output");
const { applyFilters } = require("./list-worker-outputs");

const GROUPS = {
  worker: {
    select: [
      "wo.worker_id as group_id",
      db.raw("CONCAT(w.first_name, ' ', w.last_name) as group_name"),
      "w.username as group_code",
    ],
    group: ["wo.worker_id", "w.first_name", "w.last_name", "w.username"],
    order: "group_name",
  },
  department: {
    select: [
      "wo.department_id as group_id",
      "d.name as group_name",
      "d.code as group_code",
    ],
    group: ["wo.department_id", "d.name", "d.code"],
    order: "d.name",
  },
  product: {
    select: [
      "wo.product_id as group_id",
      "p.name as group_name",
      "p.sku as group_code",
    ],
    group: ["wo.product_id", "p.name", "p.sku"],
    order: "p.name",
  },
  day: {
    select: [
      db.raw("wo.worked_at::date as group_id"),
      db.raw("wo.worked_at::date as group_name"),
      db.raw("NULL as group_code"),
    ],
    group: [db.raw("wo.worked_at::date")],
    order: "group_id",
  },
};

const summaryWorkerOutputs = async (filters, actor) => {
  const { group_by = "worker", date_from, date_to } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const group = GROUPS[group_by];
  const query = applyActorScope(formatOutputQuery(), actor);
  applyFilters(query, filters);

  const rows = await query
    .clone()
    .clearSelect()
    .select(...group.select)
    .count({ entries_count: "wo.id" })
    .sum({ total_quantity: "wo.quantity" })
    .sum({ total_amount: "wo.total_amount" })
    .groupBy(group.group)
    .orderBy(group.order, group_by === "day" ? "desc" : "asc");

  return {
    group_by,
    summary: rows.map((row) => ({
      ...row,
      entries_count: Number(row.entries_count || 0),
      total_quantity: Number(row.total_quantity || 0),
      total_amount: Number(row.total_amount || 0),
    })),
  };
};

module.exports = summaryWorkerOutputs;
