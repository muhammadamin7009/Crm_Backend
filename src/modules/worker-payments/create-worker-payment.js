const db = require("../../db");
const { BadRequestError } = require("../../shared/errors");
const { getWorker } = require("./helpers");
const { getFormattedPayment } = require("./format-payment");
const { getAdvanceBalance } = require("../worker-advances/helpers");

const formatMoney = (value) =>
  new Intl.NumberFormat("uz-UZ").format(Number(value || 0));

const assertPeriod = ({ period_from, period_to }) => {
  if (period_from && period_to && new Date(period_from) > new Date(period_to)) {
    throw new BadRequestError("period_from period_to dan katta bo'lmasligi kerak");
  }
};

const applyPeriodFilter = (query, column, periodFrom, periodTo) => {
  if (periodFrom) query.andWhere(column, ">=", periodFrom);
  if (periodTo) query.andWhere(column, "<=", periodTo);
  return query;
};

const getRemainingBalance = async ({ workerId, periodFrom, periodTo, excludePaymentId }) => {
  const earnedQuery = db("worker_outputs")
    .where({ worker_id: workerId, is_deleted: false });

  const paidQuery = db("worker_payments")
    .where({ worker_id: workerId, is_deleted: false });

  applyPeriodFilter(earnedQuery, "worked_at", periodFrom, periodTo);

  if (periodFrom || periodTo) {
    if (periodFrom) {
      paidQuery.andWhere((qb) => {
        qb.where("period_to", ">=", periodFrom).orWhereNull("period_to");
      });
    }

    if (periodTo) {
      paidQuery.andWhere((qb) => {
        qb.where("period_from", "<=", periodTo).orWhereNull("period_from");
      });
    }
  }

  if (excludePaymentId) {
    paidQuery.andWhereNot("id", excludePaymentId);
  }

  const [earned, paid] = await Promise.all([
    earnedQuery.sum({ total_earned: "total_amount" }).first(),
    paidQuery
      .sum({ cash_paid: "amount" })
      .sum({ advance_deducted: "advance_deduction" })
      .first(),
  ]);

  const totalEarned = Number(earned.total_earned || 0);
  const totalPaid = Number(paid.cash_paid || 0) + Number(paid.advance_deducted || 0);

  return {
    total_earned: totalEarned,
    total_paid: totalPaid,
    remaining: totalEarned - totalPaid,
  };
};

const assertPaymentDoesNotExceedBalance = async ({
  workerId,
  amount,
  advanceDeduction = 0,
  periodFrom,
  periodTo,
  excludePaymentId,
}) => {
  const balance = await getRemainingBalance({
    workerId,
    periodFrom,
    periodTo,
    excludePaymentId,
  });

  const settledAmount = Number(amount) + Number(advanceDeduction);

  if (settledAmount > balance.remaining) {
    if (balance.remaining <= 0) {
      const overpaid = Math.abs(balance.remaining);
      const detail = overpaid
        ? ` Hozir ortiqcha to'langan summa: ${formatMoney(overpaid)} so'm.`
        : "";

      throw new BadRequestError(
        `Ishchining qolgan ish haqi yo'q.${detail}`,
      );
    }

    throw new BadRequestError(
      `To'lov summasi qolgan ish haqidan oshmasligi kerak. Qolgan summa: ${formatMoney(balance.remaining)} so'm`,
    );
  }
};

const createWorkerPayment = async (body, actor) => {
  assertPeriod(body);
  await getWorker(Number(body.worker_id));

  if (body.payment_type === "advance") {
    throw new BadRequestError("Avansni alohida 'Avans berish' orqali kiriting");
  }

  const advanceDeduction = Number(body.advance_deduction || 0);
  if (Number(body.amount || 0) + advanceDeduction <= 0) {
    throw new BadRequestError("Naqd to'lov yoki avans ushlanmasi kiritilishi kerak");
  }

  if (advanceDeduction > 0) {
    const advanceBalance = await getAdvanceBalance(Number(body.worker_id));
    if (advanceDeduction > advanceBalance.remaining_advance) {
      throw new BadRequestError(`Avansdan ushlanma qolgan avansdan oshmasin. Qolgan avans: ${formatMoney(advanceBalance.remaining_advance)} so'm`);
    }
  }

  await assertPaymentDoesNotExceedBalance({
    workerId: Number(body.worker_id),
    amount: Number(body.amount),
    advanceDeduction,
    periodFrom: body.period_from || null,
    periodTo: body.period_to || null,
  });

  const [created] = await db("worker_payments")
    .insert({
      worker_id: Number(body.worker_id),
      amount: Number(body.amount),
      advance_deduction: advanceDeduction,
      payment_type: body.payment_type || "salary",
      paid_at: body.paid_at || db.fn.now(),
      period_from: body.period_from || null,
      period_to: body.period_to || null,
      note: body.note || null,
      created_by: actor.id,
    })
    .returning("id");

  const payment = await getFormattedPayment(created.id || created);
  return { worker_payment: payment };
};

module.exports = createWorkerPayment;
module.exports.assertPeriod = assertPeriod;
module.exports.assertPaymentDoesNotExceedBalance = assertPaymentDoesNotExceedBalance;
module.exports.getRemainingBalance = getRemainingBalance;
