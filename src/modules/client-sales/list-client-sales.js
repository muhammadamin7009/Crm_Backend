const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { formatSaleQuery, selectSaleFields } = require("./format-sale");

const SORT_COLUMNS = {
  sold_at: "cs.sold_at",
  created_at: "cs.created_at",
  updated_at: "cs.updated_at",
  total_amount: "cs.total_amount",
  debt_amount: "cs.debt_amount",
};

const applyFilters = (query, filters) => {
  const { q, client_id, product_id, date_from, date_to } = filters;

  if (q) {
    query.andWhere((qb) => {
      qb.whereILike("cl.first_name", `%${q}%`)
        .orWhereILike("cl.last_name", `%${q}%`)
        .orWhereILike("cl.username", `%${q}%`)
        .orWhereILike("p.name", `%${q}%`)
        .orWhereILike("p.sku", `%${q}%`)
        .orWhereILike("cs.note", `%${q}%`);
    });
  }

  if (client_id) query.andWhere("cs.client_id", Number(client_id));
  if (product_id) query.andWhere("cs.product_id", Number(product_id));
  if (date_from) query.andWhere("cs.sold_at", ">=", date_from);
  if (date_to) query.andWhere("cs.sold_at", "<=", date_to);

  return query;
};

const listClientSales = async (filters) => {
  const {
    limit = 20,
    offset = 0,
    sort_by = "sold_at",
    sort_order = "desc",
    date_from,
    date_to,
  } = filters;

  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const query = applyFilters(formatSaleQuery(), filters);

  const countQuery = query.clone().clearSelect().countDistinct({ count: "cs.id" }).first();
  const totalQuery = query
    .clone()
    .clearSelect()
    .sum({ total_amount: "cs.total_amount" })
    .sum({ returned_amount: db.raw("COALESCE(cra.returned_amount, 0)") })
    .sum({
      paid_amount: db.raw("cs.paid_amount + COALESCE(cpa.extra_paid_amount, 0)"),
    })
    .sum({
      debt_amount: db.raw(
        "cs.total_amount - COALESCE(cra.returned_amount, 0) - cs.paid_amount - COALESCE(cpa.extra_paid_amount, 0)",
      ),
    })
    .first();

  const [clientSales, { count }, totals] = await Promise.all([
    selectSaleFields(query.clone())
      .orderBy(SORT_COLUMNS[sort_by], sort_order)
      .orderBy("cs.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    countQuery,
    totalQuery,
  ]);

  return {
    client_sales: clientSales,
    totals: {
      total_amount: Number(totals.total_amount || 0),
      returned_amount: Number(totals.returned_amount || 0),
      paid_amount: Number(totals.paid_amount || 0),
      debt_amount: Number(totals.debt_amount || 0),
    },
    pageInfo: {
      total: Number(count),
      offset: Number(offset),
      limit: Number(limit),
    },
  };
};

module.exports = listClientSales;
module.exports.applyFilters = applyFilters;
