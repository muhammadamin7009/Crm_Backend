const db = require("../../db");
const { assertPaymentDoesNotExceedDebt, getClient, getClientSale } = require("./helpers");
const { getFormattedPayment } = require("./format-payment");
const { BadRequestError } = require("../../shared/errors");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

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

  const createdId = await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const [created] = await trx("client_payments")
        .insert({
          client_id: clientId,
          client_sale_id: saleId,
          amount: Number(body.amount),
          paid_at: body.paid_at || trx.fn.now(),
          note: body.note || null,
          created_by: actor.id,
        })
        .returning("id");
      const id = created.id || created;
      await syncCashTransaction(trx, {
        sourceType: "client_payment",
        sourceId: id,
        transactionType: "income",
        amount: body.amount,
        accountId: body.account_id,
        transactedAt: body.paid_at,
        description: `Mijoz to'lovi #${id}`,
        createdBy: actor.id,
      });
      return id;
    }),
  );

  const payment = await getFormattedPayment(createdId);
  return { client_payment: payment };
};

module.exports = createClientPayment;
