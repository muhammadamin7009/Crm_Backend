const db = require("../../db");
const {
  assertPaymentDoesNotExceedDebt,
  getClient,
  getClientSale,
  getExistingPayment,
} = require("./helpers");
const { getFormattedPayment } = require("./format-payment");
const { BadRequestError } = require("../../shared/errors");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

const updateClientPayment = async (body, { id }, actor) => {
  const existing = await getExistingPayment(id);
  const clientId =
    body.client_id !== undefined ? Number(body.client_id) : Number(existing.client_id);
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

  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const paidAt = body.paid_at || existing.paid_at;
      await trx("client_payments").where({ id }).update({
        client_id: clientId,
        client_sale_id: saleId,
        amount,
        accountId: body.account_id,
        paid_at: paidAt,
        note: body.note !== undefined ? body.note || null : existing.note,
        updated_at: trx.fn.now(),
      });
      await syncCashTransaction(trx, {
        sourceType: "client_payment",
        sourceId: id,
        transactionType: "income",
        amount,
        transactedAt: paidAt,
        description: `Mijoz to'lovi #${id}`,
        createdBy: actor?.id || existing.created_by,
      });
    }),
  );

  const payment = await getFormattedPayment(id);
  return { client_payment: payment };
};

module.exports = updateClientPayment;
