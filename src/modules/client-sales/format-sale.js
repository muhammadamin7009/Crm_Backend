const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const formatSaleQuery = () =>
  db("client_sales as cs")
    .leftJoin(
      db("client_payments")
        .where({ is_deleted: false })
        .select("client_sale_id")
        .sum({ extra_paid_amount: "amount" })
        .groupBy("client_sale_id")
        .as("cpa"),
      "cpa.client_sale_id",
      "cs.id",
    )
    .leftJoin(
      db("client_returns")
        .where({ is_deleted: false })
        .select("client_sale_id")
        .sum({ returned_amount: "amount" })
        .sum({ returned_quantity: "quantity" })
        .groupBy("client_sale_id")
        .as("cra"),
      "cra.client_sale_id",
      "cs.id",
    )
    .leftJoin("users as cl", "cl.id", "cs.client_id")
    .leftJoin("products as p", "p.id", "cs.product_id")
    .leftJoin("users as c", "c.id", "cs.created_by")
    .where("cs.is_deleted", false);

const selectSaleFields = (query) =>
  query.select(
    "cs.id",
    "cs.batch_id",
    "cs.client_id",
    db.raw("CONCAT(cl.first_name, ' ', cl.last_name) as client_name"),
    "cl.username as client_username",
    "cs.product_id",
    "p.name as product_name",
    "p.sku as product_sku",
    "p.model as product_model",
    "cs.quantity",
    "cs.unit_price",
    "cs.total_amount",
    db.raw("COALESCE(cra.returned_quantity, 0) as returned_quantity"),
    db.raw("COALESCE(cra.returned_amount, 0) as returned_amount"),
    "cs.paid_amount",
    db.raw("COALESCE(cpa.extra_paid_amount, 0) as extra_paid_amount"),
    db.raw("(cs.paid_amount + COALESCE(cpa.extra_paid_amount, 0)) as current_paid_amount"),
    db.raw("(cs.total_amount - COALESCE(cra.returned_amount, 0) - cs.paid_amount - COALESCE(cpa.extra_paid_amount, 0)) as remaining_debt"),
    db.raw("(cs.total_amount - COALESCE(cra.returned_amount, 0) - cs.paid_amount - COALESCE(cpa.extra_paid_amount, 0)) as debt_amount"),
    "cs.debt_amount as initial_debt_amount",
    "cs.sold_at",
    "cs.note",
    "cs.created_by",
    db.raw("CONCAT(c.first_name, ' ', c.last_name) as created_by_name"),
    "cs.created_at",
    "cs.updated_at",
  );

const getFormattedSale = async (id) => {
  const sale = await selectSaleFields(formatSaleQuery().where("cs.id", id)).first();

  if (!sale) throw new NotFoundError("Savdo yozuvi topilmadi");
  return sale;
};

module.exports = {
  formatSaleQuery,
  getFormattedSale,
  selectSaleFields,
};
