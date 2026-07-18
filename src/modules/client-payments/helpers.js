const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const formatMoney = (value) =>
  new Intl.NumberFormat("uz-UZ").format(Number(value || 0));

const getClient = async (clientId) => {
  const client = await db("users")
    .where({ id: clientId, is_deleted: false, role: "client" })
    .select("id", "first_name", "last_name", "username", "role")
    .first();

  if (!client) throw new BadRequestError("Client role'dagi user topilmadi");
  return client;
};

const getClientSale = async (saleId) => {
  const sale = await db("client_sales")
    .where({ id: saleId, is_deleted: false })
    .first();

  if (!sale) throw new NotFoundError("Savdo yozuvi topilmadi");
  return sale;
};

const getExistingPayment = async (id) => {
  const payment = await db("client_payments")
    .where({ id, is_deleted: false })
    .first();

  if (!payment) throw new NotFoundError("Client to'lovi topilmadi");
  return payment;
};

const getClientRemainingDebt = async ({
  clientId,
  saleId,
  excludePaymentId,
}) => {
  const salesQuery = db("client_sales")
    .where({ is_deleted: false })
    .andWhere("client_id", clientId);
  const paymentsQuery = db("client_payments")
    .where({ is_deleted: false })
    .andWhere("client_id", clientId);
  const returnsQuery = db("client_returns")
    .where({ is_deleted: false })
    .andWhere("client_id", clientId);
  const openingDebtQuery = db("users")
    .where({ id: clientId, is_deleted: false, role: "client" })
    .select("opening_debt")
    .first();

  if (saleId) {
    salesQuery.andWhere("id", saleId);
    paymentsQuery.andWhere("client_sale_id", saleId);
    returnsQuery.andWhere("client_sale_id", saleId);
  }

  if (excludePaymentId) paymentsQuery.andWhereNot("id", excludePaymentId);

  const [sales, payments, returns, client] = await Promise.all([
    salesQuery
      .sum({ total_amount: "total_amount" })
      .sum({ initial_paid_amount: "paid_amount" })
      .first(),
    paymentsQuery.sum({ extra_paid_amount: "amount" }).first(),
    returnsQuery.sum({ returned_amount: "amount" }).first(),
    saleId ? Promise.resolve({ opening_debt: 0 }) : openingDebtQuery,
  ]);

  const openingDebtAmount = Number(client?.opening_debt || 0);
  const totalAmount = Number(sales.total_amount || 0);
  const initialPaidAmount = Number(sales.initial_paid_amount || 0);
  const extraPaidAmount = Number(payments.extra_paid_amount || 0);
  const returnedAmount = Number(returns.returned_amount || 0);

  return {
    opening_debt_amount: openingDebtAmount,
    total_amount: totalAmount,
    returned_amount: returnedAmount,
    paid_amount: initialPaidAmount + extraPaidAmount,
    debt_amount:
      openingDebtAmount +
      totalAmount -
      returnedAmount -
      initialPaidAmount -
      extraPaidAmount,
  };
};

const assertPaymentDoesNotExceedDebt = async ({
  clientId,
  saleId,
  amount,
  excludePaymentId,
}) => {
  const balance = await getClientRemainingDebt({
    clientId,
    saleId,
    excludePaymentId,
  });

  if (Number(amount) > balance.debt_amount) {
    throw new BadRequestError(
      `To'lov summasi qolgan qarzdan oshmasligi kerak. Qolgan qarz: ${formatMoney(balance.debt_amount)} so'm`,
    );
  }
};

module.exports = {
  assertPaymentDoesNotExceedDebt,
  getClient,
  getClientRemainingDebt,
  getClientSale,
  getExistingPayment,
};
