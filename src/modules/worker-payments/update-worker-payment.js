const db = require("../../db");
const { getExistingPayment, getWorker } = require("./helpers");
const { assertPaymentDoesNotExceedBalance, assertPeriod } = require("./create-worker-payment");
const { getFormattedPayment } = require("./format-payment");
const { getAdvanceBalance } = require("../worker-advances/helpers");
const { BadRequestError } = require("../../shared/errors");
const { syncCashTransaction } = require("../../shared/finance/cash-ledger");

const updateWorkerPayment = async (body, { id }, actor) => {
  const existing = await getExistingPayment(id);

  const workerId =
    body.worker_id !== undefined ? Number(body.worker_id) : Number(existing.worker_id);
  const periodFrom = body.period_from !== undefined ? body.period_from : existing.period_from;
  const periodTo = body.period_to !== undefined ? body.period_to : existing.period_to;
  const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);
  const advanceDeduction =
    body.advance_deduction !== undefined
      ? Number(body.advance_deduction)
      : Number(existing.advance_deduction || 0);

  assertPeriod({
    period_from: periodFrom,
    period_to: periodTo,
  });
  await getWorker(workerId);

  if ((body.payment_type || existing.payment_type) === "advance") {
    throw new BadRequestError("Avansni alohida 'Avans berish' orqali kiriting");
  }
  const advanceBalance = await getAdvanceBalance(workerId);
  const availableAdvance =
    advanceBalance.remaining_advance + Number(existing.advance_deduction || 0);
  if (advanceDeduction > availableAdvance) {
    throw new BadRequestError("Avansdan ushlanma qolgan avansdan oshmasin");
  }

  await assertPaymentDoesNotExceedBalance({
    workerId,
    amount,
    advanceDeduction,
    excludePaymentId: id,
  });

  await db.transaction((trx) =>
    db.runWithDatabase(trx, async () => {
      const paidAt = body.paid_at || existing.paid_at;
      await trx("worker_payments").where({ id }).update({
        worker_id: workerId,
        amount,
        accountId: body.account_id,
        advance_deduction: advanceDeduction,
        payment_type: body.payment_type || existing.payment_type,
        paid_at: paidAt,
        period_from: periodFrom,
        period_to: periodTo,
        note: body.note !== undefined ? body.note || null : existing.note,
        updated_at: trx.fn.now(),
      });
      await syncCashTransaction(trx, {
        sourceType: "worker_payment",
        sourceId: id,
        transactionType: "expense",
        amount,
        transactedAt: paidAt,
        description: `Ishchi to'lovi #${id}`,
        createdBy: actor?.id || existing.created_by,
      });
    }),
  );

  const payment = await getFormattedPayment(id);
  return { worker_payment: payment };
};

module.exports = updateWorkerPayment;
