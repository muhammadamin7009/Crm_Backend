const { BadRequestError } = require("../../shared/errors");
const { formatPaymentQuery, selectPaymentFields } = require("./format-payment");

const SORT_COLUMNS = {
  paid_at: "cp.paid_at",
  created_at: "cp.created_at",
  updated_at: "cp.updated_at",
  amount: "cp.amount",
};

const applyFilters = (query, filters) => {
  const { q, client_id, client_sale_id, date_from, date_to } = filters;

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("cl.first_name", `%${q}%`)
        .orWhereILike("cl.last_name", `%${q}%`)
        .orWhereILike("cl.username", `%${q}%`)
        .orWhereILike("p.name", `%${q}%`)
        .orWhereILike("p.sku", `%${q}%`)
        .orWhereILike("cp.note", `%${q}%`);
    });
  }

  if (client_id) query.andWhere("cp.client_id", Number(client_id));
  if (client_sale_id) query.andWhere("cp.client_sale_id", Number(client_sale_id));
  if (date_from) query.andWhere("cp.paid_at", ">=", date_from);
  if (date_to) query.andWhere("cp.paid_at", "<=", date_to);

  return query;
};

const listClientPayments = async (filters) => {
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

  const query = applyFilters(formatPaymentQuery(), filters);

  const countQuery = query.clone().clearSelect().countDistinct({ count: "cp.id" }).first();
  const totalQuery = query.clone().clearSelect().sum({ total_paid: "cp.amount" }).first();

  const [clientPayments, { count }, totals] = await Promise.all([
    selectPaymentFields(query.clone())
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .orderBy("cp.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
    totalQuery,
  ]);

  return {
    client_payments: clientPayments,
    totals: {
      total_paid: Number(totals.total_paid || 0),
    },
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listClientPayments;
module.exports.applyFilters = applyFilters;
