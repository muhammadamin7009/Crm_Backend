const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { getClient } = require("./helpers");

const getClientBalance = async ({ client_id, date_from, date_to }) => {
  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const salesQuery = db("client_sales").where({ is_deleted: false });
  const paymentsQuery = db("client_payments").where({ is_deleted: false });

  if (client_id) {
    await getClient(Number(client_id));
    salesQuery.andWhere("client_id", Number(client_id));
    paymentsQuery.andWhere("client_id", Number(client_id));
  }
  if (date_from) {
    salesQuery.andWhere("sold_at", ">=", date_from);
    paymentsQuery.andWhere("paid_at", ">=", date_from);
  }
  if (date_to) {
    salesQuery.andWhere("sold_at", "<=", date_to);
    paymentsQuery.andWhere("paid_at", "<=", date_to);
  }

  const [sales, payments] = await Promise.all([
    salesQuery
      .sum({ total_amount: "total_amount" })
      .sum({ initial_paid_amount: "paid_amount" })
      .first(),
    paymentsQuery.sum({ extra_paid_amount: "amount" }).first(),
  ]);

  const totalAmount = Number(sales.total_amount || 0);
  const paidAmount =
    Number(sales.initial_paid_amount || 0) +
    Number(payments.extra_paid_amount || 0);

  return {
    client_id: client_id ? Number(client_id) : null,
    balance: {
      total_amount: totalAmount,
      paid_amount: paidAmount,
      debt_amount: totalAmount - paidAmount,
    },
  };
};

module.exports = getClientBalance;
