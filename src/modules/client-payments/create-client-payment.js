const db = require("../../db");
const { assertPaymentDoesNotExceedDebt, getClient, getClientSale } = require("./helpers");
const { getFormattedPayment } = require("./format-payment");
const { BadRequestError } = require("../../shared/errors");

const createClientPayment = async (body, actor) => {
  const clientId = Number(body.client_id);
  const saleId = body.client_sale_id ? Number(body.client_sale_id) : null;

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
    amount: Number(body.amount),
  });

  const [created] = await db("client_payments")
    .insert({
      client_id: clientId,
      client_sale_id: saleId,
      amount: Number(body.amount),
      paid_at: body.paid_at || db.fn.now(),
      note: body.note || null,
      created_by: actor.id,
    })
    .returning("id");

  const payment = await getFormattedPayment(created.id || created);
  return { client_payment: payment };
};

module.exports = createClientPayment;
