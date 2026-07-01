const db = require("../../db");

const formatPaymentQuery = () =>
  db("worker_payments as wp")
    .leftJoin("users as w", "w.id", "wp.worker_id")
    .leftJoin("users as c", "c.id", "wp.created_by")
    .where("wp.is_deleted", false);

const selectPaymentFields = (query) =>
  query.select(
    "wp.id",
    "wp.worker_id",
    db.raw("CONCAT(w.first_name, ' ', w.last_name) as worker_name"),
    "w.username as worker_username",
    "wp.amount",
    "wp.advance_deduction",
    "wp.other_deduction",
    db.raw("(wp.amount + wp.advance_deduction + wp.other_deduction) as settled_amount"),
    "wp.payment_type",
    "wp.paid_at",
    "wp.period_from",
    "wp.period_to",
    "wp.note",
    "wp.created_by",
    db.raw("CONCAT(c.first_name, ' ', c.last_name) as created_by_name"),
    "wp.created_at",
    "wp.updated_at",
  );

const getFormattedPayment = async (id) =>
  selectPaymentFields(formatPaymentQuery().where("wp.id", id)).first();

module.exports = {
  formatPaymentQuery,
  getFormattedPayment,
  selectPaymentFields,
};
