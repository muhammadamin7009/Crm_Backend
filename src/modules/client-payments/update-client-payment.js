const db = require("../../db");
const {
  assertPaymentDoesNotExceedDebt,
  getClient,
  getClientSale,
  getExistingPayment,
} = require("./helpers");
const { getFormattedPayment } = require("./format-payment");
const { BadRequestError } = require("../../shared/errors");

const updateClientPayment = async (body, { id }) => {
  const existing = await getExistingPayment(id);
  const clientId = body.client_id !== undefined ? Number(body.client_id) : Number(existing.client_id);
  const saleId =
    body.client_sale_id !== undefined
      ? body.client_sale_id
        ? Number(body.client_sale_id)
        : null
      : existing.client_sale_id
        ? Number(existing.client_sale_id)
        : null;
  const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);

  await getClient(clientId);

  if (saleId) {
    const sale = await getClientSale(saleId);
    if (Number(sale.client_id) !== clientId) {
      throw new BadRequestError("Tanlangan savdo ushbu clientga tegishli emas");
    }
  }

  await assertPaymentDoesNotExceedDebt({
    clientId,
    saleId,
    amount,
    excludePaymentId: id,
  });

  await db("client_payments")
    .where({ id })
    .update({
      client_id: clientId,
      client_sale_id: saleId,
      amount,
      paid_at: body.paid_at || existing.paid_at,
      note: body.note !== undefined ? body.note || null : existing.note,
      updated_at: db.fn.now(),
    });

  const payment = await getFormattedPayment(id);
  return { client_payment: payment };
};

module.exports = updateClientPayment;
