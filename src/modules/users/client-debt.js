const db = require("../../db");
const { BadRequestError, ForbiddenError } = require("../../shared/errors");

const canManageClientDebt = (actor) =>
  actor?.role === "super_admin" ||
  actor?.permissions?.includes("*") ||
  actor?.permissions?.includes("client_sales.manage");

const assertCanManageClientDebt = (actor) => {
  if (!canManageClientDebt(actor)) {
    throw new ForbiddenError(
      "Mijoz qarzdorligini boshqarish uchun ruxsat yo'q",
    );
  }
};

const normalizeDebt = (value) => {
  const debt = Number(value || 0);
  if (!Number.isFinite(debt) || debt < 0) {
    throw new BadRequestError(
      "Mijoz qarzdorligi 0 yoki undan katta bo'lishi kerak",
    );
  }
  return Number(debt.toFixed(2));
};

const getClientBalanceValues = async (
  clientId,
  executor = db,
  options = {},
) => {
  const includeOpeningDebt = options.includeOpeningDebt !== false;
  const [client, sales, payments, returns] = await Promise.all([
    executor("users")
      .where({ id: Number(clientId), is_deleted: false, role: "client" })
      .select("id", "opening_debt")
      .first(),
    executor("client_sales")
      .where({ client_id: Number(clientId), is_deleted: false })
      .sum({ total_amount: "total_amount" })
      .sum({ initial_paid_amount: "paid_amount" })
      .first(),
    executor("client_payments")
      .where({ client_id: Number(clientId), is_deleted: false })
      .sum({ extra_paid_amount: "amount" })
      .first(),
    executor("client_returns")
      .where({ client_id: Number(clientId), is_deleted: false })
      .sum({ returned_amount: "amount" })
      .first(),
  ]);

  if (!client) throw new BadRequestError("Client role'dagi user topilmadi");

  const openingDebt = includeOpeningDebt ? Number(client.opening_debt || 0) : 0;
  const totalAmount = Number(sales.total_amount || 0);
  const returnedAmount = Number(returns.returned_amount || 0);
  const paidAmount =
    Number(sales.initial_paid_amount || 0) +
    Number(payments.extra_paid_amount || 0);

  return {
    opening_debt_amount: openingDebt,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    returned_amount: returnedAmount,
    debt_amount: openingDebt + totalAmount - returnedAmount - paidAmount,
  };
};

module.exports = {
  assertCanManageClientDebt,
  getClientBalanceValues,
  normalizeDebt,
};
