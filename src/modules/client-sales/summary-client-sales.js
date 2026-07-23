const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { formatSaleQuery } = require("./format-sale");
const { applyFilters } = require("./list-client-sales");

const GROUPS = {
  client: {
    select: [
      "cs.client_id as group_id",
      db.raw("CONCAT(cl.first_name, ' ', cl.last_name) as group_name"),
      "cl.username as group_code",
    ],
    group: ["cs.client_id", "cl.first_name", "cl.last_name", "cl.username"],
    order: "group_name",
  },
  product: {
    select: ["cs.product_id as group_id", "p.name as group_name", "p.sku as group_code"],
    group: ["cs.product_id", "p.name", "p.sku"],
    order: "p.name",
  },
  day: {
    select: [
      db.raw("cs.sold_at::date as group_id"),
      db.raw("cs.sold_at::date as group_name"),
      db.raw("NULL as group_code"),
    ],
    group: [db.raw("cs.sold_at::date")],
    order: "group_id",
  },
};

const summaryClientSales = async (filters) => {
  const { group_by = "client", date_from, date_to } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const group = GROUPS[group_by];
  const query = applyFilters(formatSaleQuery(), filters);

  const rows = await query
    .clone()
    .clearSelect()
    .select(...group.select)
    .count({ sales_count: "cs.id" })
    .sum({ total_amount: "cs.total_amount" })
    .sum({
      paid_amount: db.raw(
        "cs.paid_amount + COALESCE(cpa.extra_paid_amount, 0) - COALESCE(cra.refunded_amount, 0)",
      ),
    })
    .sum({
      debt_amount: db.raw(
        "cs.total_amount - COALESCE(cra.returned_amount, 0) - cs.paid_amount - COALESCE(cpa.extra_paid_amount, 0) + COALESCE(cra.refunded_amount, 0)",
      ),
    })
    .groupBy(group.group)
    .orderBy(group.order, group_by === "day" ? "desc" : "asc");

  let unlinkedPaymentsByClient = {};

  if (group_by === "client") {
    const paymentsQuery = db("client_payments as cp")
      .leftJoin("users as cl", "cl.id", "cp.client_id")
      .where("cp.is_deleted", false)
      .whereNull("cp.client_sale_id");

    if (filters.client_id) paymentsQuery.andWhere("cp.client_id", Number(filters.client_id));
    if (filters.date_from) paymentsQuery.andWhere("cp.paid_at", ">=", filters.date_from);
    if (filters.date_to) paymentsQuery.andWhere("cp.paid_at", "<=", filters.date_to);
    if (filters.q) {
      paymentsQuery.andWhere((qb) => {
        qb.whereILike("cl.first_name", `%${filters.q}%`)
          .orWhereILike("cl.last_name", `%${filters.q}%`)
          .orWhereILike("cl.username", `%${filters.q}%`);
      });
    }

    const unlinkedPayments = await paymentsQuery
      .select("cp.client_id")
      .sum({ total_paid: "cp.amount" })
      .groupBy("cp.client_id");

    unlinkedPaymentsByClient = unlinkedPayments.reduce((acc, row) => {
      acc[Number(row.client_id)] = Number(row.total_paid || 0);
      return acc;
    }, {});
  }

  return {
    group_by,
    summary: rows.map((row) => {
      const unlinkedPaid = unlinkedPaymentsByClient[Number(row.group_id)] || 0;
      const paidAmount = Number(row.paid_amount || 0) + unlinkedPaid;

      return {
        ...row,
        sales_count: Number(row.sales_count || 0),
        total_amount: Number(row.total_amount || 0),
        paid_amount: paidAmount,
        debt_amount: Number(row.debt_amount || 0) - unlinkedPaid,
      };
    }),
  };
};

module.exports = summaryClientSales;
