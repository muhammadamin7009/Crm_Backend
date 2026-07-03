const db = require("../../db");
const { BadRequestError, ForbiddenError } = require("../../shared/errors");
const { getWorker, isManager } = require("./helpers");
const { getAdvanceBalance } = require("../worker-advances/helpers");

const getWorkerBalance = async ({ worker_id, date_from, date_to }, actor) => {
  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    throw new BadRequestError("date_from date_to dan katta bo'lmasligi kerak");
  }

  const requestedWorkerId = worker_id ? Number(worker_id) : null;

  if (!isManager(actor) && actor?.role !== "worker") {
    throw new ForbiddenError("Balansni ko'rishga ruxsatingiz yo'q");
  }

  if (!isManager(actor) && requestedWorkerId && requestedWorkerId !== Number(actor.id)) {
    throw new ForbiddenError("Boshqa ishchi balansini ko'ra olmaysiz");
  }

  const workerId = isManager(actor) ? requestedWorkerId : Number(actor.id);
  if (workerId) await getWorker(workerId);

  const earnedQuery = db("worker_outputs as wo").where("wo.is_deleted", false);
  const paidQuery = db("worker_payments as wp").where("wp.is_deleted", false);

  if (workerId) {
    earnedQuery.andWhere("wo.worker_id", workerId);
    paidQuery.andWhere("wp.worker_id", workerId);
  }
  if (date_from) {
    earnedQuery.andWhere("wo.worked_at", ">=", date_from);
    paidQuery.andWhere("wp.paid_at", ">=", date_from);
  }
  if (date_to) {
    earnedQuery.andWhere("wo.worked_at", "<=", date_to);
    paidQuery.andWhere("wp.paid_at", "<=", date_to);
  }

  const [earned, paid, advanceBalance] = await Promise.all([
    earnedQuery.clone().sum({ total_earned: "wo.total_amount" }).first(),
    paidQuery
      .clone()
      .sum({ cash_paid: "wp.amount" })
      .sum({ advance_deducted: "wp.advance_deduction" })
      .sum({ other_deducted: "wp.other_deduction" })
      .first(),
    getAdvanceBalance(workerId),
  ]);

  const totalEarned = Number(earned.total_earned || 0);
  const cashPaid = Number(paid.cash_paid || 0);
  const advanceDeducted = Number(paid.advance_deducted || 0);
  const otherDeducted = Number(paid.other_deducted || 0);
  const totalPaid = cashPaid + advanceDeducted + otherDeducted;
  let previousRemaining = 0;
  let newEarnings = totalEarned;
  let lastPayment = null;

  if (workerId && !date_from && !date_to) {
    lastPayment = await db("worker_payments")
      .where({ worker_id: workerId, is_deleted: false })
      .select("id", "amount", "advance_deduction", "paid_at", "created_at")
      .orderBy("paid_at", "desc")
      .orderBy("created_at", "desc")
      .first();

    if (lastPayment) {
      const earnedBefore = await db("worker_outputs")
        .where({ worker_id: workerId, is_deleted: false })
        .andWhere("created_at", "<=", lastPayment.created_at)
        .sum({ total: "total_amount" })
        .first();
      const earnedBeforePayment = Number(earnedBefore.total || 0);

      previousRemaining = Math.max(earnedBeforePayment - totalPaid, 0);
      newEarnings = Math.max(totalEarned - earnedBeforePayment, 0);
    }
  }

  return {
    worker_id: workerId,
    date_from: date_from || null,
    date_to: date_to || null,
    balance: {
      total_earned: totalEarned,
      total_paid: totalPaid,
      cash_paid: cashPaid,
      advance_deducted: advanceDeducted,
      other_deducted: otherDeducted,
      total_advance: advanceBalance.total_advance,
      remaining_advance: advanceBalance.remaining_advance,
      remaining: totalEarned - totalPaid,
      previous_remaining: previousRemaining,
      new_earnings: newEarnings,
      last_payment_date: lastPayment?.paid_at || null,
    },
  };
};

module.exports = getWorkerBalance;
