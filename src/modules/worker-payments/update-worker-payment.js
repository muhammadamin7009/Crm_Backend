const db = require("../../db");
const { getExistingPayment, getWorker } = require("./helpers");
const {
  assertPaymentDoesNotExceedBalance,
  assertPeriod,
} = require("./create-worker-payment");
const { getFormattedPayment } = require("./format-payment");

const updateWorkerPayment = async (body, { id }) => {
  const existing = await getExistingPayment(id);

  const workerId =
    body.worker_id !== undefined ? Number(body.worker_id) : Number(existing.worker_id);
  const periodFrom =
    body.period_from !== undefined ? body.period_from : existing.period_from;
  const periodTo =
    body.period_to !== undefined ? body.period_to : existing.period_to;
  const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);

  assertPeriod({
    period_from: periodFrom,
    period_to: periodTo,
  });
  await getWorker(workerId);

  await assertPaymentDoesNotExceedBalance({
    workerId,
    amount,
    periodFrom,
    periodTo,
    excludePaymentId: id,
  });

  await db("worker_payments")
    .where({ id })
    .update({
      worker_id: workerId,
      amount,
      payment_type: body.payment_type || existing.payment_type,
      paid_at: body.paid_at || existing.paid_at,
      period_from: periodFrom,
      period_to: periodTo,
      note: body.note !== undefined ? body.note || null : existing.note,
      updated_at: db.fn.now(),
    });

  const payment = await getFormattedPayment(id);
  return { worker_payment: payment };
};

module.exports = updateWorkerPayment;
