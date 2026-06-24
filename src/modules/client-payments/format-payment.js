const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const formatPaymentQuery = () =>
  db("client_payments as cp")
    .leftJoin("users as cl", "cl.id", "cp.client_id")
    .leftJoin("client_sales as cs", "cs.id", "cp.client_sale_id")
    .leftJoin("products as p", "p.id", "cs.product_id")
    .leftJoin("users as c", "c.id", "cp.created_by")
    .where("cp.is_deleted", false);

const selectPaymentFields = (query) =>
  query.select(
    "cp.id",
    "cp.client_id",
    db.raw("CONCAT(cl.first_name, ' ', cl.last_name) as client_name"),
    "cl.username as client_username",
    "cp.client_sale_id",
    "p.name as product_name",
    "p.sku as product_sku",
    "cp.amount",
    "cp.paid_at",
    "cp.note",
    "cp.created_by",
    db.raw("CONCAT(c.first_name, ' ', c.last_name) as created_by_name"),
    "cp.created_at",
    "cp.updated_at",
  );

const getFormattedPayment = async (id) => {
  const payment = await selectPaymentFields(formatPaymentQuery().where("cp.id", id)).first();

  if (!payment) throw new NotFoundError("Client to'lovi topilmadi");
  return payment;
};

module.exports = {
  formatPaymentQuery,
  getFormattedPayment,
  selectPaymentFields,
};
