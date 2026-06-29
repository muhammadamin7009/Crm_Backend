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
    paidQuery.clone()
      .sum({ cash_paid: "wp.amount" })
      .sum({ advance_deducted: "wp.advance_deduction" })
      .first(),
    getAdvanceBalance(workerId),
  ]);

  const totalEarned = Number(earned.total_earned || 0);
  const cashPaid = Number(paid.cash_paid || 0);
  const advanceDeducted = Number(paid.advance_deducted || 0);
  const totalPaid = cashPaid + advanceDeducted;

  return {
    worker_id: workerId,
    date_from: date_from || null,
    date_to: date_to || null,
    balance: {
      total_earned: totalEarned,
      total_paid: totalPaid,
      cash_paid: cashPaid,
      advance_deducted: advanceDeducted,
      total_advance: advanceBalance.total_advance,
      remaining_advance: advanceBalance.remaining_advance,
      remaining: totalEarned - totalPaid,
    },
  };
};

module.exports = getWorkerBalance;
